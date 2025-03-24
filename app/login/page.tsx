"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { login, error: authError, isLoading: authIsLoading, setError, setIsLoading } = useAuth()
  const [error, setLocalError] = useState<string | null>(null)
  const [isLoading, setLocalIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for success message from password reset
    const message = searchParams.get("message")
    if (message === "Password+updated+successfully") {
      // You could show a success message here
      console.log("Password updated successfully")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError("Por favor ingrese su email y contraseña")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Add timeout to prevent hanging requests
      const loginPromise = login({ email, password })
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Login timeout - el servidor no responde")), 10000),
      )

      await Promise.race([loginPromise, timeoutPromise])

      router.push("/")
    } catch (error: any) {
      console.error("Login error:", error)

      // Provide more user-friendly error messages
      if (error.message.includes("timeout")) {
        setError("El servidor no responde. Por favor intente más tarde.")
      } else if (error.message.includes("Invalid login")) {
        setError("Email o contraseña incorrectos")
      } else if (error.message.includes("network")) {
        setError("Error de conexión. Verifique su conexión a internet.")
      } else {
        setError(error.message || "Error al iniciar sesión")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-4">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <h1 className="text-2xl font-bold">Quadrifoglio</h1>
            </div>
            <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">Ingrese sus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || authError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error || authError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@quadrifoglio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" onClick={handleSubmit} disabled={isLoading || authIsLoading}>
              {isLoading || authIsLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
            <Button variant="link" className="w-full" onClick={() => router.push("/forgot-password")}>
              ¿Olvidó su contraseña?
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Usuarios de prueba:</p>
          <p>admin@quadrifoglio.com / admin123</p>
          <p>gerente@quadrifoglio.com / gerente123</p>
          <p>empleado@quadrifoglio.com / empleado123</p>
        </div>
      </div>
    </div>
  )
}

