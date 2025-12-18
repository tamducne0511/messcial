import './App.css'
import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Login from "./pages/Login"
import Register from "./pages/Register"
import ProtectedRoute from './pages/ProtectedRoute'
import PostList from './pages/PostList'
import FriendList from './pages/FriendList'
import FriendGoiY from './pages/FriendGoiY'
import EditPost from './components/editPost'
import MyPage from './pages/MyPage'
import MyPost from './components/myPost'
import AllImages from './components/allImage'
import AllVideos from './components/allVideo'
import ListSearch from './components/ListSearch'
import Messenger from './pages/Messenger'
import FriendCommonList from './components/friendCommonList'
function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PostList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <Navigate to="/?create=true" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/friendlist"
          element={
            <ProtectedRoute>
              <FriendList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends/list/:id"
          element={
            <ProtectedRoute>
              <FriendCommonList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friendgoiy"
          element={
            <ProtectedRoute>
              <FriendGoiY />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <EditPost />
            </ProtectedRoute>
          }
        />
        <Route
          path="/myPage/:id"
          element={
            <ProtectedRoute>
              <MyPage/>
            </ProtectedRoute>
          }
          />
          <Route
            path="/myPost/:id"
            element={
              <ProtectedRoute>
                <MyPost/>
              </ProtectedRoute>
            }
        />
        <Route
          path="/allImage/:id"
          element={
            <ProtectedRoute>
              <AllImages/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/allVideo/:id"
          element={
            <ProtectedRoute>
              <AllVideos/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/listsearch"
          element={
            <ProtectedRoute>
              <ListSearch/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/messenger"
          element={
            <ProtectedRoute>
              <Messenger/>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
