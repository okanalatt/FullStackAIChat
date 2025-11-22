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
            // Varsayılan
            string finalFeeling = "Analiz Edilemedi";
            double finalScore = 0;

            try
            {
                // 1. ADRES: Sağlam Çalışan TÜRKÇE Model (Winvoker)
                // Bu model API desteklidir, Space kurmana gerek kalmaz.
                string url = "https://api-inference.huggingface.co/models/winvoker/bert-base-turkish-sentiment-analysis";

                string apiKey = _configuration.GetValue<string>("AIServices:ApiKey");

                using HttpClient client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(60); // Model uyuyorsa uyanmasını bekle

                // API Key varsa ekle
                if (!string.IsNullOrEmpty(apiKey))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                }

                var requestBody = new { inputs = request.Description };
                string jsonBody = JsonSerializer.Serialize(requestBody);
                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // İSTEK AT
                HttpResponseMessage response = await client.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using (JsonDocument doc = JsonDocument.Parse(result))
                    {
                        JsonElement root = doc.RootElement;

                        // Hugging Face bazen [[...]] bazen [...] döner.
                        if (root.ValueKind == JsonValueKind.Array)
                        {
                            JsonElement firstItem = root[0];
                            if (firstItem.ValueKind == JsonValueKind.Array) firstItem = firstItem[0];

                            if (firstItem.TryGetProperty("label", out JsonElement labelProp))
                            {
                                string label = labelProp.GetString();

                                // WINVOKER MODELİ İÇİN TÜRKÇELEŞTİRME
                                // Bu model "LABEL_1" (Pozitif) ve "LABEL_0" (Negatif) döner.
                                if (label == "LABEL_1" || label == "Positive" || label == "Pozitif")
                                    finalFeeling = "Pozitif";
                                else if (label == "LABEL_0" || label == "Negative" || label == "Negatif")
                                    finalFeeling = "Negatif";
                                else
                                    finalFeeling = label;
                            }

                            if (firstItem.TryGetProperty("score", out JsonElement scoreProp))
                            {
                                finalScore = scoreProp.GetDouble();
                            }
                        }
                    }
                }
                else
                {
                    // Hata kodunu parantez içinde görelim
                    finalFeeling = $"Hata: {response.StatusCode}";
                }
            }
            catch (Exception ex)
            {
                finalFeeling = $"Sistem Hatası: {ex.Message}";
            }

            // Uzun hata mesajlarını kes
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