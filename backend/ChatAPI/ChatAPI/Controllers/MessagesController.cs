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
        // Post - api/Messages (LOGLARI GÖSTEREN VERSİYON)
        [HttpPost]
        public async Task<ActionResult<Message>> PostMessage(SentimentRequest request)
        {
            string Feeling = "Analiz Edilemedi";
            double Score = 0;

            try
            {
                // 1. Ayarları Al
                string apiKey = _configuration.GetValue<string>("AIServices:ApiKey");
                string model = _configuration.GetValue<string>("AIServices:Model");

                // Eğer model boşsa varsayılanı ata
                if (string.IsNullOrEmpty(model)) model = "distilbert-base-uncased-finetuned-sst-2-english";

                string url = $"https://api-inference.huggingface.co/models/{model}";

                Console.WriteLine($"[BILGI] Model: {model} adresine istek atılıyor..."); // LOG EKLENDİ

                using HttpClient client = new HttpClient();
                if (!string.IsNullOrEmpty(apiKey))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                }

                client.Timeout = TimeSpan.FromSeconds(10); // Süreyi biraz artırdık

                var requestBody = new { inputs = request.Description };
                string json = JsonSerializer.Serialize(requestBody);
                using var content = new StringContent(json, Encoding.UTF8, "application/json");

                HttpResponseMessage response = await client.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    string result = await response.Content.ReadAsStringAsync();
                    // JSON kontrolü
                    if (!string.IsNullOrEmpty(result) && result.Trim().StartsWith("["))
                    {
                        var sentimentResponse = JsonSerializer.Deserialize<List<List<SentimentResponse>>>(result);
                        if (sentimentResponse != null && sentimentResponse.Count > 0)
                        {
                            var resultSentiment = sentimentResponse.First().OrderByDescending(x => x.score).First();
                            Feeling = resultSentiment.label;
                            Score = resultSentiment.score;
                            Console.WriteLine($"[BASARILI] Analiz Sonucu: {Feeling}"); // LOG EKLENDİ
                        }
                    }
                    else
                    {
                        Console.WriteLine($"[HATA] Beklenmeyen Yanıt Formatı: {result}"); // LOG EKLENDİ
                    }
                }
                else
                {
                    // Hata kodunu konsola bas
                    string errorDetails = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[HATA] Hugging Face Hatası! Kod: {response.StatusCode}, Detay: {errorDetails}"); // LOG EKLENDİ
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[KRITIK HATA] AI Servisi Çalışmadı: {ex.Message}"); // LOG EKLENDİ
            }

            // Veritabanı Kaydı
            Message message = new Message
            {
                Name = request.Name,
                Description = request.Description,
                Feeling = Feeling,
                Score = (float)Score,
                Timestamp = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMessages), new { id = message.Id }, message);
        }
    }
    }
