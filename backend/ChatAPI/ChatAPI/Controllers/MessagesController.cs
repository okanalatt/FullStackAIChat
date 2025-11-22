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
                // 1. HEDEF: Senin Python Space'inin ÖZEL adresi
                // Hugging Face Space'leri genellikle bu formatta API verir:
                string url = "https://okanalat-duygu-analizi.hf.space/api/predict";

                Console.WriteLine($"[BASLADI] Python Space'e ({url}) gidiliyor...");

                using HttpClient client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(30);

                // 2. GRADIO FORMATI: Gradio bizden "data" içinde bir dizi ister
                var payload = new { data = new[] { request.Description } };
                string jsonBody = JsonSerializer.Serialize(payload);

                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // 3. İSTEK AT
                HttpResponseMessage response = await client.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"[YANIT KODU] : {response.StatusCode}");

                if (response.IsSuccessStatusCode)
                {
                    // Gradio'nun cevabı şöyledir: { "data": [ "LABEL", SKOR ] }
                    using (JsonDocument doc = JsonDocument.Parse(result))
                    {
                        // "data" dizisini bul
                        if (doc.RootElement.TryGetProperty("data", out JsonElement dataArray) && dataArray.ValueKind == JsonValueKind.Array)
                        {
                            // Senin Python kodun return result['label'], float(result['score']) yapıyor.
                            // Yani data[0] = label, data[1] = score

                            finalFeeling = dataArray[0].GetString(); // Label (Örn: "positive")

                            if (dataArray.GetArrayLength() > 1)
                            {
                                finalScore = dataArray[1].GetDouble(); // Score
                            }

                            // Türkçeleştirme (Opsiyonel)
                            if (finalFeeling?.ToLower() == "positive") finalFeeling = "Pozitif";
                            if (finalFeeling?.ToLower() == "negative") finalFeeling = "Negatif";

                            Console.WriteLine($"[SONUC] : {finalFeeling} - {finalScore}");
                        }
                    }
                }
                else
                {
                    Console.WriteLine($"[PYTHON SPACE HATASI] : {result}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[HATA] Bağlantı sorunu: {ex.Message}");
            }

            // KAYDET
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