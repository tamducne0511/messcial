import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "../services/useAuthService";

export const useAuthStore = create((set, get) => ({
    user: null,
    accessToken: localStorage.getItem("accessToken") || null,
    loading: false,

    // Đăng ký
    signUp: async (formData) => {
        try {
            set({ loading: true });

            await authService.signUp(formData);

            toast.success("Đăng ký thành công! Hãy đăng nhập.");
            return true;
        } catch (err) {
            console.log(err);
            toast.error(err?.response?.data?.msg || "Đăng ký thất bại");
            return false;
        } finally {
            set({ loading: false });
        }
    },

    // Đăng nhập
    signIn: async (formData) => {
        try {
            set({ loading: true });
            const res = await authService.signIn(formData);

            // Lưu token nếu backend trả về
            if (res?.accessToken) {
                localStorage.setItem("accessToken", res.accessToken);
                set({ accessToken: res.accessToken });
            }

            // Nạp thông tin user từ API
            try {
                await get().fetchMe();
            } catch {
                // fetchMe sẽ show toast nếu lỗi
            }

            toast.success("Đăng nhập thành công!");
            return true;
        } catch (err) {
            console.log(err);
            toast.error(err?.response?.data?.msg || "Sai tài khoản hoặc mật khẩu");
            return false;
        } finally {
            set({ loading: false });
        }
    },

    // Đăng xuất
    SignOut: async () => {
        try {
            set({ loading: true })
            await authService.signOut()
            //xoa token
            localStorage.removeItem("accessToken");
            // Clear state
            set({ accessToken: null, user: null });
            toast.success("Đã đăng xuất");
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Không thể đăng xuất!");
        } finally {
            set({ loading: false })
        }
    },
    fetchMe: async () => {
        try {
            set({ loading: true })
            const user = await authService.fetchMe();
            console.log(user)
            set({ user })
        } catch (error) {
            console.log(error)
            set({ user: null, accessToken: null })
            toast.error("Loi xay ra khi lay du lieu")
        } finally {
            set({ loading: false })
        }
    },
    clearState: () => {
        localStorage.removeItem("accessToken");
        set({
            user: null,
            accessToken: null,
        });
    },

}));
