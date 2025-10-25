namespace ChatAPI.Models
{
    public class SentimentRequest
    {
        public  string? Name { get; set; } //Mesaji gonderin kisi adi veya kullanici adi

        public string? Description { get; set; } //Mesajin aciklamasi opsiyonel
    }
}
