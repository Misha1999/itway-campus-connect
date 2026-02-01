import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AddCampusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    city: string;
    address?: string;
    phone?: string;
    email?: string;
    email_domain?: string;
  }) => Promise<boolean>;
}

export function AddCampusDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddCampusDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailDomain, setEmailDomain] = useState("");

  const resetForm = () => {
    setName("");
    setCity("");
    setAddress("");
    setPhone("");
    setEmail("");
    setEmailDomain("");
  };

  const handleSubmit = async () => {
    if (!name || !city) return;

    setLoading(true);
    const success = await onSubmit({
      name,
      city,
      address: address || undefined,
      phone: phone || undefined,
      email: email || undefined,
      email_domain: emailDomain || undefined,
    });

    if (success) {
      resetForm();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новий заклад</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ITway Долина"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Місто *</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Долина"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Адреса</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="вул. Шевченка, 15"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380341234567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="office@itway.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailDomain">Домен пошти користувачів</Label>
            <Input
              id="emailDomain"
              value={emailDomain}
              onChange={(e) => setEmailDomain(e.target.value)}
              placeholder="itway.dolyna.ua"
            />
            <p className="text-xs text-muted-foreground">
              Логіни користувачів будуть створюватись у цьому домені
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name || !city}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Створити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
