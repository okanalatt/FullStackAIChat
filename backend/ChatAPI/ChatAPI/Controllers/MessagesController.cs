using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using ChatAPI.Data;
using ChatAPI.Models;

namespace ChatAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MessagesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Message>>> GetMessages()
        {
            return await _context.Messages.OrderBy(m => m.Timestamp).ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Message>> PostMessage(SentimentRequest request)
        {
            // Varsayılan değerler
            string finalFeeling = "Analiz Edilemedi";
            double finalScore = 0;

            try
            {
                // BURASI KRİTİK NOKTA: Adresi elle yazdık, hata şansı %0
                string url = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english";

                using HttpClient client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(5); // 5 saniye bekle

                var requestBody = new { inputs = request.Description };
                string jsonBody = JsonSerializer.Serialize(requestBody);
                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // İsteği gönder
                HttpResponseMessage response = await client.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    string result = await response.Content.ReadAsStringAsync();

                    // JSON'u güvenli şekilde parçala
                    using (JsonDocument doc = JsonDocument.Parse(result))
                    {
                        JsonElement root = doc.RootElement;
                        if (root.ValueKind == JsonValueKind.Array) // Liste mi geldi?
                        {
                            // HuggingFace bazen [[{}]] bazen [{}] döner. İkisini de çözelim:
                            JsonElement firstItem = root[0];
                            if (firstItem.ValueKind == JsonValueKind.Array)
                            {
                                firstItem = firstItem[0];
                            }

                            if (firstItem.TryGetProperty("label", out JsonElement labelProp))
                                finalFeeling = labelProp.GetString(); // POSITIVE / NEGATIVE

                            if (firstItem.TryGetProperty("score", out JsonElement scoreProp))
                                finalScore = scoreProp.GetDouble();
                        }
                    }
                }
            }
            catch (Exception)
            {
                // Hata olursa sessizce yut ve "Analiz Edilemedi" olarak devam et.
                // Böylece site asla çökmez.
                finalFeeling = "Analiz Hatası";
            }

            // Kaydet
            Message message = new Message
            {
                Name = request.Name,
                Description = request.Description,
                Feeling = finalFeeling,
                Score = (float)finalScore,
                Timestamp = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMessages), new { id = message.Id }, message);
        }
    }
}