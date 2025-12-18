import React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAuthStore } from "../stores/useAuthStore"

const loginSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Password phải ít nhất 6 ký tự"),
})

const Login = () => {
    const navigate = useNavigate()
    const { signIn } = useAuthStore()

    const {
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const onSubmit = async (data) => {
        try {
            await signIn(data)
            toast.success("Đăng nhập thành công!")
            navigate("/")
        } catch (err) {
            toast.error(err.message || "Đăng nhập thất bại")
        }
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Login to your account</CardTitle>
                <CardDescription>
                    Enter your email below to login to your account
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex flex-col gap-6">

                        {/* Email */}
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" {...field} placeholder="m@example.com" />
                                    {errors.email && (
                                        <p className="text-red-500 text-sm">{errors.email.message}</p>
                                    )}
                                </div>
                            )}
                        />

                        {/* Password */}
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" {...field} placeholder="••••••" />
                                    {errors.password && (
                                        <p className="text-red-500 text-sm">{errors.password.message}</p>
                                    )}
                                </div>
                            )}
                        />

                    </div>
                </form>
            </CardContent>

            <CardFooter className="flex-col gap-2">
                <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={handleSubmit(onSubmit)}
                >
                    {isSubmitting ? "Logging in..." : "Login"}
                </Button>

                <Link to="/register" className="text-blue-600 hover:underline">
                    Register
                </Link>
            </CardFooter>
        </Card>
    )
}

export default Login
