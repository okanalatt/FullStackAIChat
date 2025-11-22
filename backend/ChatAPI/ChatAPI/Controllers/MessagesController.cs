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
            // Varsayılan Değerler
            string finalFeeling = "Analiz Edilemedi";
            double finalScore = 0;

            try
            {
                // 1. AYARLAR: Senin Python dosyanın kullandığı TÜRKÇE model
                string modelName = "savasy/bert-base-turkish-sentiment-cased";
                string url = $"https://api-inference.huggingface.co/models/{modelName}";

                // API Key'i Render ayarlarından çek
                string apiKey = _configuration.GetValue<string>("AIServices:ApiKey");

                Console.WriteLine($"[BASLADI] Türkçe Model ({modelName}) deneniyor... (Süre 40sn)");

                using HttpClient client = new HttpClient();
                // Türkçe modeller ağırdır, uyanması zaman alır. Süreyi 40 saniye yaptım.
                client.Timeout = TimeSpan.FromSeconds(40);

                if (!string.IsNullOrEmpty(apiKey))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                }

                var requestBody = new { inputs = request.Description };
                string jsonBody = JsonSerializer.Serialize(requestBody);
                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // 2. İSTEK GÖNDER
                HttpResponseMessage response = await client.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"[YANIT KODU] : {response.StatusCode}");

                // 3. YANITI İŞLE
                if (response.IsSuccessStatusCode)
                {
                    using (JsonDocument doc = JsonDocument.Parse(result))
                    {
                        JsonElement root = doc.RootElement;
                        // Hugging Face bazen [[...]] bazen [...] döner. İkisini de yakalayalım.
                        if (root.ValueKind == JsonValueKind.Array)
                        {
                            JsonElement firstItem = root[0];
                            if (firstItem.ValueKind == JsonValueKind.Array) firstItem = firstItem[0];

                            // Gelen JSON'daki 'label' ve 'score' değerlerini al
                            if (firstItem.TryGetProperty("label", out JsonElement labelProp))
                                finalFeeling = labelProp.GetString(); // positive / negative

                            if (firstItem.TryGetProperty("score", out JsonElement scoreProp))
                                finalScore = scoreProp.GetDouble();

                            Console.WriteLine($"[SONUC] : {finalFeeling}");
                        }
                    }
                }
                else
                {
                    // Hata varsa (410, 503 vs.) loga yaz
                    Console.WriteLine($"[API HATASI] : {result}");
                }
            }
            catch (Exception ex)
            {
                // Süre dolarsa veya başka hata olursa buraya düşer
                Console.WriteLine($"[KRITIK HATA] : {ex.Message}");
            }

            // 4. VERİTABANINA KAYDET (Hata olsa bile kaydeder)
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