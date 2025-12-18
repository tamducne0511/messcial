import React, { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import axios from "axios";
import { useParams } from "react-router-dom";
export default function AllVideos() {
    const [videos, setVideos] = useState([]);
    const { id } = useParams();
    useEffect(() => {
        //api lay ds ảnh và video
        const fetchVideos = async () => {
            try {
                const res = await axios.get(`http://localhost:5001/api/posts/images/${id}`, {
                    headers: {
                        Authorization: "Bearer " + localStorage.getItem("accessToken"),
                    },
                });
                console.log(res.data.videos)
                setVideos(res.data.videos);
            } catch (err) {
                console.error(err);
            }
        };
        fetchVideos();
    }, []);
    console.log(videos);

    return (
        <div className="bg-gray-100 min-h-screen">

            {/* Navbar */}
            <Navbar />

            <div className="w-full max-w-5xl mx-auto p-4">
                <h2 className="text-2xl font-bold mb-4">Danh sách ảnh và video</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {videos.map((video, index) => (
                        <div key={index} className="p-4 flex flex-col items-center">
                            <video src={video.url} className="w-24 h-24 w-full mb-2 object-cover" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

}
