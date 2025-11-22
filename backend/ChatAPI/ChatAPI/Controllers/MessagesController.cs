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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Message>>> GetMessages()
        {
            return await _context.Messages.OrderBy(m => m.Timestamp).ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Message>> PostMessage(SentimentRequest request)
        {
            // Başlangıçta boş, hatayı buraya dolduracağız
            string finalFeeling = "";
            double finalScore = 0;

            try
            {
                // İngilizce Model (Test İçin)
                string url = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english";
                string apiKey = _configuration.GetValue<string>("AIServices:ApiKey");

                using HttpClient client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(30);

                if (!string.IsNullOrEmpty(apiKey))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                }

                var requestBody = new { inputs = request.Description };
                string jsonBody = JsonSerializer.Serialize(requestBody);
                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                HttpResponseMessage response = await client.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using (JsonDocument doc = JsonDocument.Parse(result))
                    {
                        JsonElement root = doc.RootElement;
                        if (root.ValueKind == JsonValueKind.Array)
                        {
                            JsonElement firstItem = root[0];
                            if (firstItem.ValueKind == JsonValueKind.Array) firstItem = firstItem[0];

                            if (firstItem.TryGetProperty("label", out JsonElement labelProp))
                                finalFeeling = labelProp.GetString();

                            if (firstItem.TryGetProperty("score", out JsonElement scoreProp))
                                finalScore = scoreProp.GetDouble();
                        }
                        else
                        {
                            // JSON ama beklediğimiz formatta değilse içeriği yaz
                            finalFeeling = $"Format Hatası: {result.Substring(0, Math.Min(result.Length, 50))}";
                        }
                    }
                }
                else
                {
                    // API HATA VERDİYSE KODUNU VE MESAJINI EKRANA YAZ
                    // Örn: (401 Unauthorized)
                    finalFeeling = $"API Hatası: {response.StatusCode} - {result}";
                }
            }
            catch (Exception ex)
            {
                // KOD PATLARSA SEBEBİNİ EKRANA YAZ
                // Örn: (Connection Refused)
                finalFeeling = $"Sistem Hatası: {ex.Message}";
            }

            // Çok uzun hata mesajları veritabanını patlatmasın diye kırpıyoruz
            if (finalFeeling.Length > 100) finalFeeling = finalFeeling.Substring(0, 97) + "...";

            Message message = new Message
            {
                Name = request.Name,
                Description = request.Description,
                Feeling = finalFeeling, // ARTIK BURADA GERÇEK HATA YAZACAK
                Score = (float)finalScore,
                Timestamp = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMessages), new { id = message.Id }, message);
        }
    }
}