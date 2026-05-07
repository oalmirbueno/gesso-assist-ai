import { FormEvent, useState } from "react";
import { AlertCircle, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: window.location.origin,
                data: { name },
              },
            });

      if (result.error) throw result.error;
      toast.success(
        mode === "login" ? "Login realizado" : "Cadastro criado. Verifique seu e-mail.",
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 space-y-4 max-w-md">
      <Alert className="border-warning/40 bg-warning/10">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Faça login para testar o webhook</AlertTitle>
        <AlertDescription>
          O modo “Via service (RLS)” roda no navegador e precisa de usuário autenticado.
        </AlertDescription>
      </Alert>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="auth-name">Nome</Label>
            <Input
              id="auth-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="auth-email">E-mail</Label>
          <Input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="atendente@gsgesso.com.br"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Senha</Label>
          <Input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={loading} className="gap-2">
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Criar conta" : "Já tenho conta"}
          </Button>
        </div>
      </form>
    </Card>
  );
}