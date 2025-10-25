namespace ChatAPI.Models
{
    public class SentimentResponse
    {
        public string label { get; set; } //Duygu turu  Pozitif , notr , negatif
        public float score { get; set; } // Duygu analizi skoru
    }
}
