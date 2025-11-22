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
            string finalFeeling = "Analiz Edilemedi";
            double finalScore = 0;

            try
            {
                // BU ADRES ASLA "GONE" HATASI VERMEZ
                string url = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english";

                using HttpClient client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(30);

                // ŞİFRE YOK, DİREKT HALKA AÇIK KAPIDAN GİRİYORUZ
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
                    }
                }
                else
                {
                    // HATA OLURSA KODUNU GÖRECEĞİZ (GONE YAZMAMASI LAZIM ARTIK)
                    finalFeeling = $"Hata: {response.StatusCode}";
                }
            }
            catch (Exception ex)
            {
                finalFeeling = $"Sistem Hatası: {ex.Message}";
            }

            // Uzun mesajları kes
            if (finalFeeling.Length > 50) finalFeeling = finalFeeling.Substring(0, 47) + "...";

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