using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using ChatAPI.Data;
using ChatAPI.Models;
using Microsoft.Extensions.Configuration;

namespace ChatAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public MessagesController(AppDbContext context, IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _config = config;
            _httpClientFactory = httpClientFactory;
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
                // Model adını buradan değiştirebilirsin
                string model = _config["HuggingFace:Model"] ?? "savasy/bert-base-turkish-sentiment-cased";
                string url = $"https://api-inference.huggingface.co/models/{model}";

                // API key: öncelikle environment variable, yoksa appsettings.json içinden
                string apiKey = Environment.GetEnvironmentVariable("HUGGINGFACE_API_KEY")
                                 ?? _config["HuggingFace:ApiKey"];

                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);

                if (!string.IsNullOrWhiteSpace(apiKey))
                {
                    client.DefaultRequestHeaders.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
                }

                var requestBody = new { inputs = request.Description };
                string jsonBody = JsonSerializer.Serialize(requestBody);
                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                HttpResponseMessage response = await client.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    // HF farklı şekillerde dönebilir: array of objects OR array of arrays
                    // Burada JSON'u parse edip ilk label/score'u almaya çalışıyoruz
                    using var doc = JsonDocument.Parse(result);
                    JsonElement root = doc.RootElement;

                    JsonElement candidate = default;
                    bool found = false;

                    if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                    {
                        // case A: [ { "label": "...", "score": ... } ]
                        var first = root[0];
                        if (first.ValueKind == JsonValueKind.Object && first.TryGetProperty("label", out _))
                        {
                            candidate = first;
                            found = true;
                        }
                        else if (first.ValueKind == JsonValueKind.Array && first.GetArrayLength() > 0)
                        {
                            // case B: [ [ { "label": "...", "score": ... } ] ]
                            var inner = first[0];
                            if (inner.ValueKind == JsonValueKind.Object && inner.TryGetProperty("label", out _))
                            {
                                candidate = inner;
                                found = true;
                            }
                        }
                    }
                    // Eğer parse edilemedi ise fallback olarak Analiz Edilemedi kalacak
                    if (found)
                    {
                        if (candidate.TryGetProperty("label", out JsonElement labelProp))
                        {
                            string rawLabel = labelProp.GetString() ?? "";
                            string normalized = rawLabel.Trim().ToLowerInvariant();

                            // Model etiketleri farklı olabilir (POSITIVE/positive, label_0, Türkçe vb.)
                            if (normalized.Contains("positive") || normalized.Contains("pozitif") || normalized.Contains("pos"))
                                finalFeeling = "Pozitif";
                            else if (normalized.Contains("negative") || normalized.Contains("negatif") || normalized.Contains("neg"))
                                finalFeeling = "Negatif";
                            else if (normalized.Contains("neutral") || normalized.Contains("nötr") || normalized.Contains("neutral"))
                                finalFeeling = "Nötr";
                            else
                                finalFeeling = rawLabel; // bilinmeyen etiketleri olduğu gibi koy
                        }

                        if (candidate.TryGetProperty("score", out JsonElement scoreProp) && scoreProp.ValueKind == JsonValueKind.Number)
                        {
                            finalScore = scoreProp.GetDouble();
                        }
                    }
                }
                else
                {
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
