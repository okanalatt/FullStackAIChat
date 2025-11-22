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
                // 1. ADRES: Senin Kendi Space Adresin
                string url = "https://okanalat-duygu-analizi.hf.space/api/predict";

                // 2. DATA: Gradio formatına uygun paketleme
                var payload = new { data = new[] { request.Description } };
                string jsonBody = JsonSerializer.Serialize(payload);

                using HttpClient client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(60); // Space uyanana kadar bekle

                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // 3. İSTEK
                HttpResponseMessage response = await client.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using (JsonDocument doc = JsonDocument.Parse(result))
                    {
                        // Gradio cevabı: { "data": [ "LABEL", SKOR ] }
                        if (doc.RootElement.TryGetProperty("data", out JsonElement dataArray) && dataArray.ValueKind == JsonValueKind.Array)
                        {
                            // Label (data[0])
                            string label = dataArray[0].GetString();

                            // Skor (data[1]) - Varsa al
                            if (dataArray.GetArrayLength() > 1)
                            {
                                finalScore = dataArray[1].GetDouble();
                            }

                            // Türkçeleştirme
                            if (label == "positive" || label == "Pozitif" || label == "LABEL_1") finalFeeling = "Pozitif";
                            else if (label == "negative" || label == "Negatif" || label == "LABEL_0") finalFeeling = "Negatif";
                            else if (label == "neutral" || label == "Notr") finalFeeling = "Nötr";
                            else finalFeeling = label;
                        }
                        else
                        {
                            finalFeeling = $"Format Farklı: {result}";
                        }
                    }
                }
                else
                {
                    finalFeeling = $"Space Hatası: {response.StatusCode}";
                }
            }
            catch (Exception ex)
            {
                finalFeeling = $"Bağlantı Hatası: {ex.Message}";
            }

            // Hata mesajı uzunsa kırp
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