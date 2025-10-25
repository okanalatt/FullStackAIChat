using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using ChatAPI.Data;
using ChatAPI.Models;
using System.Net.Http.Headers;

namespace ChatAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        // Constructor
        public MessagesController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // Get - api/Messages (No Such Table hatası için try-catch içerir)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Message>>> GetMessages()
        {
            try
            {
                return await _context.Messages.OrderBy(m => m.Timestamp).ToListAsync();
            }
            catch (Microsoft.Data.Sqlite.SqliteException ex)
            {
                if (ex.Message.Contains("no such table"))
                {
                    return new List<Message>();
                }
                throw;
            }
        }

        // Post - api/Messages (En son ve kapsamlı hata yönetimi içerir)
        [HttpPost]
        public async Task<ActionResult<Message>> PostMessage(SentimentRequest request)
        {
            // 1. AI Servisi Ayarlarını Al
            string apiKey = _configuration.GetValue<string>("AIServices:ApiKey");
            string model = _configuration.GetValue<string>("AIServices:Model");
            string url = $"https://api-inference.huggingface.co/models/{model}";

            // 2. HttpClient oluştur, Auth Header ve KRİTİK: ZAMAN AŞIMI (20 saniye) ekle
            using HttpClient client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            client.Timeout = TimeSpan.FromSeconds(20); // ZAMAN AŞIMI 20 SANİYEYE ÇIKARILDI

            // 3. İstek Gövdesini Hazırla
            var inputText = request.Description;
            var requestBody = new { inputs = inputText };
            string json = JsonSerializer.Serialize(requestBody);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                // 4. AI Servisine İstek Gönder
                HttpResponseMessage response = await client.PostAsync(url, content);

                // 5. AI Servisi Yanıtını Kontrol Etme (401/403/500 Hataları)
                if (!response.IsSuccessStatusCode)
                {
                    string errorContent = await response.Content.ReadAsStringAsync();
                    System.Diagnostics.Debug.WriteLine($"AI API Hatası! Durum Kodu: {response.StatusCode}. Yanıt: {errorContent}");

                    // Frontend'e açıklayıcı bir hata döndür
                    return StatusCode((int)response.StatusCode, new { error = "AI Servisi Başarısız Oldu", details = errorContent });
                }

                // 6. Ham Yanıtı Oku, Serileştir ve En Yüksek Skorlu Duyguyu Bul
                string result = await response.Content.ReadAsStringAsync();

                // Serileştirme (JSON) hatası riskine karşı
                var sentimentResponse = JsonSerializer.Deserialize<List<List<SentimentResponse>>>(result);
                var resultSentiment = sentimentResponse.First().OrderByDescending(x => x.score).First();

                // 7. Mesajı Veritabanına Kaydet
                Message message = new Message
                {
                    Name = request.Name,
                    Description = request.Description,
                    Feeling = resultSentiment.label,
                    Score = resultSentiment.score,
                    Timestamp = DateTime.UtcNow
                };

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();

                // 8. Kaydedilen ve güncellenen mesajı döndür (201 Created Status)
                return CreatedAtAction(nameof(GetMessages), new { id = message.Id }, message);
            }
            catch (TaskCanceledException)
            {
                // Zaman aşımı hatasını yakala (Timeout)
                return StatusCode(503, new { error = "AI Servisi Zaman Aşımına Uğradı", details = "Hugging Face sunucusu 20 saniye içinde yanıt vermedi. Lütfen tekrar deneyin." });
            }
            catch (Exception ex)
            {
                // Diğer genel hataları yakala (Serileştirme, Bağlantı vb.)
                return StatusCode(500, new { error = "Beklenmeyen Sunucu Hatası", details = ex.Message });
            }
        }
    }
}