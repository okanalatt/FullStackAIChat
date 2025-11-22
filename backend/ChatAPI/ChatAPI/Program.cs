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
                // 1. ADRESÝ DEÐÝÞTÝRDÝK: Senin Space Adresin
                // Hugging Face Space'leri bu adresten yayýn yapar:
                string url = "https://okanalat-duygu-analizi.hf.space/api/predict";

                Console.WriteLine($"[BASLADI] Senin Space'e ({url}) gidiliyor...");

                using HttpClient client = new HttpClient();
                // Space uyuyorsa uyanmasý uzun sürer, süreyi bol tutalým
                client.Timeout = TimeSpan.FromSeconds(60);

                // 2. GRADIO FORMATI: Gradio "data" içinde dizi ister
                var payload = new { data = new[] { request.Description } };
                string jsonBody = JsonSerializer.Serialize(payload);

                using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // 3. ÝSTEK AT
                HttpResponseMessage response = await client.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    // Gradio Cevap Formatý: { "data": [ "LABEL", SKOR, ... ] }
                    using (JsonDocument doc = JsonDocument.Parse(result))
                    {
                        if (doc.RootElement.TryGetProperty("data", out JsonElement dataArray) && dataArray.ValueKind == JsonValueKind.Array)
                        {
                            // Senin Python koduna göre: data[0] = label, data[1] = score
                            string label = dataArray[0].GetString();

                            // Türkçeleþtirme
                            if (label == "positive" || label == "Pozitif") finalFeeling = "Pozitif";
                            else if (label == "negative" || label == "Negatif") finalFeeling = "Negatif";
                            else if (label == "neutral" || label == "Notr") finalFeeling = "Nötr";
                            else finalFeeling = label;

                            if (dataArray.GetArrayLength() > 1)
                            {
                                finalScore = dataArray[1].GetDouble();
                            }
                        }
                        else
                        {
                            finalFeeling = $"Format Farklý: {result}";
                        }
                    }
                }
                else
                {
                    // Hata kodunu ekrana yaz (Gone, 404, 500 neyse görelim)
                    finalFeeling = $"Space Hatasý: {response.StatusCode}";
                }
            }
            catch (Exception ex)
            {
                finalFeeling = $"Baðlantý Hatasý: {ex.Message}";
            }

            // Hata mesajý çok uzunsa veritabanýna sýðdýr
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