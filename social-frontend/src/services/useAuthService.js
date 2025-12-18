import axios from "axios"

const API_BASE =
    import.meta.env.MODE === "development"
        ? "http://localhost:5001/api"
        : "/api"

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true, // gửi cookie nếu backend dùng
    headers: {
        "Content-Type": "application/json",
    },
})

export const authService = {
    signUp: async (data) => {
        try {
            const res = await api.post("/auth/signup", data)
            console.log("res", res)
            return res.data
        } catch (err) {
            throw err.response?.data || err
        }
    },

    signIn: async (data) => {
        try {
            const res = await api.post("/auth/signin", data)
            // lưu access token nếu backend trả về
            if (res.data.accessToken) {
                localStorage.setItem("accessToken", res.data.accessToken)
            }
            return res.data
        } catch (err) {
            throw err.response?.data || err
        }
    },

    signOut: async () => {
        try {
            const res = await api.post("/auth/signout")
            localStorage.removeItem("accessToken")
            return res.data
        } catch (err) {
            throw err.response?.data || err
        }
    },

    fetchMe: async () => {
        try {
            const res = await api.get("/user/me", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
            })
            return res.data.user
        } catch (err) {
            throw err.response?.data || err
        }
    },
}
