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
            // 1. Varsayılan Değerler (Yapay zeka çalışmazsa bunlar kullanılacak)
            string Feeling = "Analiz Edilemedi";
            double Score = 0;
            try
            {
                string apiKey = _configuration.GetValue<string>("AIServices:ApiKey");
                string model = _configuration.GetValue<string>("AIServices:Model");

                // Eğer config boş gelirse varsayılan model ata
                if (string.IsNullOrEmpty(model)) model = "distilbert-base-uncased-finetuned-sst-2-english";

                string url = $"https://api-inference.huggingface.co/models/{model}";

                using HttpClient client = new HttpClient();
                // API Key varsa ekle
                if (!string.IsNullOrEmpty(apiKey))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                }

                client.Timeout = TimeSpan.FromSeconds(5); // 5 saniye bekle, cevap yoksa geç

                var requestBody = new { inputs = request.Description };
                string json = JsonSerializer.Serialize(requestBody);
                using var content = new StringContent(json, Encoding.UTF8, "application/json");

                // AI Servisine İstek Gönder
                HttpResponseMessage response = await client.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    string result = await response.Content.ReadAsStringAsync();

                    // Gelen veri HTML mi yoksa JSON mu kontrol et (Senin aldığın hatanın çözümü)
                    if (!string.IsNullOrEmpty(result) && result.Trim().StartsWith("["))
                    {
                        // JSON ise işle
                        var sentimentResponse = JsonSerializer.Deserialize<List<List<SentimentResponse>>>(result);
                        if (sentimentResponse != null && sentimentResponse.Count > 0)
                        {
                            var resultSentiment = sentimentResponse.First().OrderByDescending(x => x.score).First();
                            Feeling = resultSentiment.label;
                            Score = resultSentiment.score;
                        }
                    }
                }
                else
                {
                    // AI sunucusu hata verdiyse logla ama devam et
                    System.Diagnostics.Debug.WriteLine($"AI API Hata Kodu: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                // İnternet yoksa, timeout olduysa veya başka bir sorun varsa buraya düşer.
                // Hata fırlatma, sadece loga yaz ve devam et.
                System.Diagnostics.Debug.WriteLine($"AI Kritik Hata (Yutuldu): {ex.Message}");
            }

            // 3. Mesajı Veritabanına Kaydet (AI sonucu ne olursa olsun burası çalışır)
            Message message = new Message
            {
                Name = request.Name,
                Description = request.Description,
                Feeling = Feeling, // Ya AI cevabı ya da "Analiz Edilemedi"
                Score = (float)Score,
                Timestamp = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            // 4. Başarılı kodu (201) ve mesajı döndür
            return CreatedAtAction(nameof(GetMessages), new { id = message.Id }, message);
        }
        }
    }
