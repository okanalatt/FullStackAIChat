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
            try
            {
                return await _context.Messages.OrderBy(m => m.Timestamp).ToListAsync();
            }
            catch
            {
                return new List<Message>();
            }
        }

        [HttpPost]
        public async Task<ActionResult<Message>> PostMessage(SentimentRequest request)
        {
            string finalFeeling = "Analiz Edilemedi";
            double finalScore = 0;
            // Config dosyasını falan boşver, direkt adresi elle yazıyoruz:
            string apiKey = _configuration.GetValue<string>("AIServices:ApiKey");
            string url = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english";

            // Loga da yazdıralım ki emin olalım
            Console.WriteLine($"[ZORLAMA URL] İstek şu adrese gidiyor: {url}");

            try
            {
                using HttpClient client = new HttpClient();
                if (!string.IsNullOrEmpty(apiKey) && apiKey.StartsWith("hf_"))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                }

                var requestBody = new { inputs = request.Description };
                string jsonBody = JsonSerializer.Serialize(requestBody);
                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // 2. İsteği Gönder
                HttpResponseMessage response = await client.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"[API YANITI] Kod: {response.StatusCode}, Icerik: {result}");

                if (response.IsSuccessStatusCode)
                {
                    // 3. Dinamik JSON Çözümleme (En Önemli Kısım)
                    using (JsonDocument doc = JsonDocument.Parse(result))
                    {
                        JsonElement root = doc.RootElement;

                        // Eğer sonuç bir Liste ise ( [[...]] veya [...] )
                        if (root.ValueKind == JsonValueKind.Array)
                        {
                            // İlk elemanı al (Hugging Face bazen iç içe liste, bazen tek liste döner)
                            JsonElement firstItem = root[0];

                            // Eğer iç içe listeyse ([[...]]) bir katman daha in
                            if (firstItem.ValueKind == JsonValueKind.Array)
                            {
                                firstItem = firstItem[0];
                            }

                            // Şimdi label ve score değerlerini okumaya çalış
                            if (firstItem.TryGetProperty("label", out JsonElement labelProp))
                            {
                                finalFeeling = labelProp.GetString() ?? "Bilinmiyor";
                            }

                            if (firstItem.TryGetProperty("score", out JsonElement scoreProp))
                            {
                                finalScore = scoreProp.GetDouble();
                            }
                            Console.WriteLine($"[BASARILI] Sonuc: {finalFeeling} - {finalScore}");
                        }
                        else
                        {
                            Console.WriteLine("[UYARI] API JSON döndü ama Array değil.");
                        }
                    }
                }
                else
                {
                    // Model Yükleniyorsa (503 hatası)
                    if (result.Contains("loading"))
                    {
                        finalFeeling = "Model Yükleniyor (Tekrar Dene)";
                    }
                    else
                    {
                        finalFeeling = $"Hata: {response.StatusCode}";
                    }
                    Console.WriteLine($"[HATA] API Başarısız: {result}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[KRITIK HATA] Kod Patladı: {ex.Message}");
            }

            // 4. Kaydet
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