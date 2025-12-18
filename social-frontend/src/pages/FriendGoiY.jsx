import React from 'react'
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import Navbar from '@/components/navbar'
import axios from 'axios'
import defaultImage from "../assets/images.jpeg"
const FriendGoiY = () => {
    const [friends, setFriends] = useState([]);
    const [requests, setRequest] = useState([])

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await axios.get("http://localhost:5001/api/invite/friends/requests", { headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") } })
                setRequest(res.data.friendRequests)
                console.log(res.data.friendRequests)
            } catch (error) {
                console.log(error)
            }
        }
        fetchRequests()
    }, [])

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const res = await axios.get("http://localhost:5001/api/invite/nonfriends", { headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") } });
                setFriends(res.data.nonFriends);
                console.log(res.data.nonFriends)
            } catch (err) {
                console.error(err);
            }
        };

        fetchFriends();
    }, []);

    const handleSendFriendRequest = async (friendId) => {
        //gọi api gửi lời mời kết bạn
        try {
            const res = await axios.post(`http://localhost:5001/api/invite/friends/request`, { friendId }, {
                headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
            });
            console.log(res)
            alert("Gửi lời mời kết bạn thành công");
        } catch (error) {
            console.error(error);
            alert("Lỗi kết bạn");
        }
    };
    const handleRequester = async (friendId) => {
        try {
            const res = await axios.post(`http://localhost:5001/api/invite/friends/accept`, { friendId }, {
                headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
            });
            console.log(res)
            alert("Đồng ý kết bạn");
        } catch (error) {
            console.error(error)
            alert("Lỗi gửi lời mời kết bạn");
        }
    }
    const handleDeleteRequester = async (friendId) => {
        try {
            const res = await axios.post(`http://localhost:5001/api/invite/friends/decline`, { friendId }, {
                headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
            });
            console.log(res)
            alert("Xóa lời mời kết bạn");
        } catch (error) {
            console.error(error)
            alert("Lỗi xóa lời mời kết bạn");
        }
    }

    return (
        <div className="w-[1800px] bg-gray-100 min-h-screen">

            <Navbar/>

            <div className="w-full max-w-5xl mx-auto p-4">
                <h2 className="text-2xl font-bold mb-4">Danh sách gợi ý</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {friends.map(friend => (
                        <Card key={friend.id} className="p-4 flex flex-col items-center">
                            <CardHeader className="flex flex-col items-center">
                                <img
                                    src={friend.avatar || defaultImage}
                                    alt={friend.username}
                                    className="w-24 h-24 rounded-full mb-2 object-cover"
                                />
                                <h3 className="font-semibold">{friend.username}</h3>
                            </CardHeader>
                            <CardFooter className="mt-2 w-full">
                                <Button variant="destructive" onClick={() => handleSendFriendRequest(friend.id)} className="w-full">
                                    Gửi lời mời
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
            <div className="w-full max-w-5xl mx-auto p-4">
                <h2 className="text-2xl font-bold mb-4">Danh sách lời mời</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {requests.map(request => (
                        <Card key={request.id} className="p-4 flex flex-col items-center">
                            <CardHeader className="flex flex-col items-center">
                                <img
                                    src={request.requester.avatar || defaultImage}
                                    alt={request.requester.username}
                                    className="w-24 h-24 rounded-full mb-2 object-cover"
                                />
                                <h3 className="font-semibold">{request.requester.username}</h3>
                            </CardHeader>
                            <CardFooter className="mt-2 flex flex-row gap-2">
                                <Button variant="destructive" onClick={() => handleRequester(request.userId)} className="w-full">
                                    Chấp nhận
                                </Button>
                                <Button variant="destructive" className="w-full" onClick={
                                    () => handleDeleteRequester(request.userId)
                                } >
                                    Xóa
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default FriendGoiY