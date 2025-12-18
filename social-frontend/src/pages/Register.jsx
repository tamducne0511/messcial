
import React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useNavigate, Link } from "react-router-dom"
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

const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    displayName: z.string().min(3, "Display name must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

const Register = () => {
    const navigate = useNavigate()
    const { signUp } = useAuthStore()
    const {
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: "",
            displayName: "",
            email: "",
            password: "",
        },
    })

    const onSubmit = async (data) => {
        try {
            const ok = await signUp(data)
            if (ok) {
                toast.success("Registration successful!")
                navigate("/login")
            } else {
                // signUp trả về false khi có lỗi (không throw)
                toast.error("Registration failed. Please check your data.")
            }
        } catch (err) {
            // trong trường hợp signUp/điệp vụ khác throw
            toast.error(err?.message || err?.response?.data?.msg || "Registration failed")
        }
    }

    return (
        <Card className="w-full w-sm">
            <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Enter your details below to register</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex flex-col gap-6">
                        {/* Username */}
                        <Controller
                            name="username"
                            control={control}
                            render={({ field }) => (
                                <div className="grid gap-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input id="username" {...field} placeholder="Your username" />
                                    {errors.username && (
                                        <p className="text-red-500 text-sm">{errors.username.message}</p>
                                    )}
                                </div>
                            )}
                        />

                        {/* Display Name */}
                        <Controller
                            name="displayName"
                            control={control}
                            render={({ field }) => (
                                <div className="grid gap-2">
                                    <Label htmlFor="displayName">Display Name</Label>
                                    <Input id="displayName" {...field} placeholder="Display Name" />
                                    {errors.displayName && (
                                        <p className="text-red-500 text-sm">{errors.displayName.message}</p>
                                    )}
                                </div>
                            )}
                        />

                        {/* Email */}
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" {...field} placeholder="m@example.com" />
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
                                    <Input id="password" {...field} type="password" placeholder="Password" />
                                    {errors.password && (
                                        <p className="text-red-500 text-sm">{errors.password.message}</p>
                                    )}
                                </div>
                            )}
                        />

                        <Button type="submit" disabled={isSubmitting} className="mt-2" variant="outline">
                            {isSubmitting ? "Registering..." : "Register"}
                        </Button>
                    </div>

                </form>
            </CardContent>
            <CardFooter className="flex justify-center gap-2">
                <span>Already have an account?</span>
                <Link to="/login" className="text-blue-600 hover:underline">
                    Login
                </Link>
            </CardFooter>
        </Card>
    )
}

export default Register
