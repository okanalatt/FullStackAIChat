namespace ChatAPI.Models;

public class Message
    
{
    public int Id { get; set; } 
    public required string Name { get; set; } //Mesaji gonderin kisi adi veya kullanici adi
    public string? Description { get; set; } //Mesajin aciklamasi opsiyonel
    public DateTime Timestamp { get; set; } = DateTime.UtcNow; //Mesajin olusturdugu zaman / Ortak saat icin UtcNow.


    public string Feeling { get; set; } //Duygu turu  Pozitif , notr , negatif
    public float Score { get; set; } // Duygu analizi skoru
}
