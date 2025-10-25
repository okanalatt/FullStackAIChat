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

        public MessagesController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // Get - api/Messages
        // Render'da oluşan "no such table" (500 Internal Server Error) hatasını çözer.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Message>>> GetMessages()
        {
            try
            {
                // Mesaj çekme denemesi
                return await _context.Messages.OrderBy(m => m.Timestamp).ToListAsync();
            }
            catch (Microsoft.Data.Sqlite.SqliteException ex)
            {
                // Eğer hata 'no such table: Messages' ise, uygulama çökmesin.
                if (ex.Message.Contains("no such table"))
                {
                    // Frontend'e boş bir mesaj listesi dönülüyor (200 OK)
                    return new List<Message>();
                }
                // Başka bir Sqlite hatası varsa, hatayı yeniden fırlat
                throw;
            }
        }

        // Post - api/Messages
        [HttpPost]
        public async Task<ActionResult<Message>> PostMessage(SentimentRequest request)
        {
            // 1. AI Servisi Ayarlarını Al
            string apiKey = _configuration.GetValue<string>("AIServices:ApiKey");
            string model = _configuration.GetValue<string>("AIServices:Model");
            string url = $"https://api-inference.huggingface.co/models/{model}";

            // 2. HttpClient oluştur ve Auth Header ekle
            using HttpClient client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            // 3. AI Servisine Gönderilecek İstek Gövdesini Hazırla
            var inputText = request.Description;
            var requestBody = new { inputs = inputText };
            string json = JsonSerializer.Serialize(requestBody);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            // 4. AI Servisine İstek Gönder
            HttpResponseMessage response = await client.PostAsync(url, content);

            // 5. AI Servisi Yanıtını Kontrol Etme (401/403 Hataları için)
            if (!response.IsSuccessStatusCode)
            {
                string errorContent = await response.Content.ReadAsStringAsync();
                System.Diagnostics.Debug.WriteLine($"AI API Hatası! Durum Kodu: {response.StatusCode}. Yanıt: {errorContent}");

                // Frontend'e açıklayıcı bir hata döndür
                return StatusCode((int)response.StatusCode, new { error = "AI Servisi Hatası", details = errorContent });
            }

            // 6. Ham Yanıtı Oku, Serileştir ve En Yüksek Skorlu Duyguyu Bul
            string result = await response.Content.ReadAsStringAsync();

            // JSON serileştirme hatasını (Invalid start of value) atlatmak için gerekli kod
            var sentimentResponse = JsonSerializer.Deserialize<List<List<SentimentResponse>>>(result);
            var resultSentiment = sentimentResponse.First().OrderByDescending(x => x.score).First();

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
    }
}