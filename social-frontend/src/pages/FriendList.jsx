import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/navbar";
import axios from "axios";
import defaultImage from "../assets/images.jpeg"
export default function FriendList() {
    const [friends, setFriends] = useState([]);

    useEffect(() => {
        //api lay ds ban be
        const fetchFriends = async () => {
            try {
                const res = await axios.get("http://localhost:5001/api/invite/friends", {
                    headers: {
                        Authorization: "Bearer " + localStorage.getItem("accessToken"),
                    },
                });
                console.log(res.data.friendsList)
                setFriends(res.data.friendsList);            
            } catch (err) {
                console.error(err);
            }
        };
        fetchFriends();
    }, []);
    console.log(friends);

    const handleUnfriend = async (id) => {
        console.log(id)
        try {
            if (!window.confirm("Bạn có chắc chắn muốn hủy kết bạn?")) {
                return;
            }
            await axios.delete(`http://localhost:5001/api/invite/friends/${id}`, {
                headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
            });
            setFriends((prev) => prev.filter((f) => f.id !== id));
            alert("Hủy kết bạn thành công");
        } catch (err) {
            console.error(err);
            alert("Lỗi hủy kết bạn");
        }
    };

    return (
        <div className="w-[1800px] bg-gray-100 min-h-screen">

            {/* Navbar */}
            <Navbar/>

            <div className="w-full max-w-5xl mx-auto p-4">
                <h2 className="text-2xl font-bold mb-4">Danh sách bạn bè</h2>
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
                                <Button variant="destructive" onClick={() => handleUnfriend(friend.id)} className="w-full">
                                    Hủy kết bạn
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>

    );

}
