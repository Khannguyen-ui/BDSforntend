import React, { useState, useEffect, useRef } from "react";
import { Spin, message, Avatar, Drawer, Input, Button } from "antd";
import {
    HeartFilled,
    MessageFilled,
    ShareAltOutlined,
    BookFilled,
    CloseOutlined,
    PlayCircleFilled,
    EnvironmentOutlined,
    FireFilled,
    ArrowLeftOutlined,
    PlusOutlined,
    CheckOutlined,
    SendOutlined,
    SmileOutlined,
    HomeFilled,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import roomService from "../../services/roomService";
import recommendService from "../../services/recommendService";
import useAuth from "../../hooks/useAuth";
import favoriteService from "../../services/favoriteService";
import commentService from "../../services/commentService";
import userService from "../../services/userService";
import ownerFollowService from "../../services/ownerFollowService";
import { formatCurrency } from "../../utils/format";

import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("vi");

const formatCount = (num) => {
    const value = Number(num || 0);
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
};

const ReelAction = ({ icon, label, active, activeClass = "", onClick }) => (
    <button onClick={onClick} className="group flex flex-col items-center gap-1 text-white">
        <div
            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center 
      bg-white/12 backdrop-blur-xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.35)]
      group-hover:scale-110 group-hover:bg-white/20 transition-all ${active ? activeClass : ""}`}
        >
            {icon}
        </div>
        <span className="text-[11px] md:text-xs font-semibold drop-shadow">{label}</span>
    </button>
);

const ReelItem = ({ room, isActive, onOpenComments, user }) => {
    const videoRef = useRef(null);
    const navigate = useNavigate();

    const [isFollowingOwner, setIsFollowingOwner] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLiked, setIsLiked] = useState(room.isLiked || false);
    const [isSaved, setIsSaved] = useState(room.isSaved || false);
    const [likeCount, setLikeCount] = useState(room.likeCount || 0);
    const [localCommentCount, setLocalCommentCount] = useState(0);

    const watchStartRef = useRef(null);
    const totalWatchRef = useRef(0);
    const trackedWatchRef = useRef(false);
    const durationRef = useRef(1);

    const currentUserId = user?.id || user?.userId || user?.identityId;

    const buildReelMetadata = (item, watchTime = 0, duration = 1) => ({
        itemType: "REEL",
        duration,
        watchTime,
        price: item?.price || 0,
        userBudget: item?.price || 0,
        province: item?.province || "",
        ward: item?.ward || "",
        district: item?.district || "",
        locationMatch: item?.district ? 1 : 0,
        categoryMatch: item?.propertyType ? 1 : 0,
    });

    const startWatch = () => {
        if (!isActive || watchStartRef.current) return;
        watchStartRef.current = Date.now();
    };

    const stopWatch = () => {
        if (!watchStartRef.current) return;
        totalWatchRef.current += (Date.now() - watchStartRef.current) / 1000;
        watchStartRef.current = null;
    };

    const getWatchTime = () => {
        let total = totalWatchRef.current;
        if (watchStartRef.current) total += (Date.now() - watchStartRef.current) / 1000;
        return Math.max(0, Math.min(total, durationRef.current || 1));
    };

    const sendWatchEvent = () => {
        if (!room?.id || trackedWatchRef.current) return;

        stopWatch();

        const duration = Math.max(1, Number(durationRef.current || videoRef.current?.duration || 1));
        const watchTime = Number(getWatchTime().toFixed(2));

        if (watchTime < 1) return;

        trackedWatchRef.current = true;

        recommendService
            .trackBehavior(room.id, "REEL", "VIEW", buildReelMetadata(room, watchTime, duration))
            .catch(() => { });
    };

    useEffect(() => {
        if (!room?.id) return;

        if (isActive) {
            trackedWatchRef.current = false;
            totalWatchRef.current = 0;
            watchStartRef.current = null;

            if (videoRef.current && !videoRef.current.paused) startWatch();
        } else {
            sendWatchEvent();
        }

        return () => {
            if (isActive) sendWatchEvent();
        };
    }, [isActive, room?.id]);

    useEffect(() => {
        if (!room?.id) return;

        commentService
            .countComments(room.id)
            .then((res) => setLocalCommentCount(Number(res.data || res || 0)))
            .catch(() => { });
    }, [room?.id]);

    useEffect(() => {
        if (!user || !room?.ownerId) return;

        ownerFollowService
            .isFollowing(room.ownerId)
            .then((res) => setIsFollowingOwner(Boolean(res.data?.result ?? res.data)))
            .catch(() => { });
    }, [user, room?.ownerId]);

    useEffect(() => {
        if (!room.videoUrl || !videoRef.current) return;

        if (isActive) {
            videoRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
        } else {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, [isActive, room.videoUrl]);

    const togglePlay = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleLike = async (e) => {
        e.stopPropagation();

        const nextLiked = !isLiked;
        setIsLiked(nextLiked);
        setLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

        try {
            await favoriteService.toggleLike(room.id, buildReelMetadata(room));
        } catch {
            setIsLiked(!nextLiked);
            setLikeCount((prev) => (nextLiked ? Math.max(0, prev - 1) : prev + 1));
            message.error("Thao tác thất bại");
        }
    };

    const handleSave = async (e) => {
        e.stopPropagation();

        const nextSaved = !isSaved;
        setIsSaved(nextSaved);

        try {
            await favoriteService.toggleSave(room.id, buildReelMetadata(room));
        } catch {
            setIsSaved(!nextSaved);
            message.error("Thao tác thất bại");
        }
    };

    const handleToggleFollow = async (e) => {
        e.stopPropagation();

        if (!user) {
            message.warning("Vui lòng đăng nhập để theo dõi chủ nhà");
            return;
        }

        if (!room?.ownerId) return;

        setFollowLoading(true);

        try {
            await ownerFollowService.toggleFollow(room.ownerId);
            setIsFollowingOwner((prev) => !prev);
        } catch {
            message.error("Không thể theo dõi chủ nhà");
        } finally {
            setFollowLoading(false);
        }
    };

    const handleShare = async (e) => {
        e.stopPropagation();

        try {
            await roomService.shareProperty(
                room.id,
                buildReelMetadata(room)
            );
        } catch { }

        navigator.clipboard.writeText(`${window.location.origin}/rooms/${room.id}`);
        message.success("Đã sao chép liên kết!");
    };

    const goToDetail = async (e) => {
        e.stopPropagation();

        try {
            await roomService.trackClick(
                room.id,
                buildReelMetadata(room)
            );
        } catch { }

        navigate(`/rooms/${room.id}`);
    };

    const goToLandlordProfile = (e) => {
        e.stopPropagation();
        const targetSlug = room.ownerSlug || room.ownerSlugSnapshot || room.ownerId;
        if (targetSlug) navigate(`/users/public-profile/${targetSlug}`);
    };

    const displayCommentCount = Math.max(localCommentCount, Number(room.commentCount || 0));

    return (
        <div className="relative w-full h-screen bg-[#020617] snap-center flex justify-center items-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e3a8a_0%,transparent_38%),radial-gradient(circle_at_bottom,#0f172a_0%,#020617_52%)]" />

            <div className="relative h-full w-full max-w-[520px] md:max-w-[560px] flex justify-center">
                <div className="relative h-full w-full md:my-4 md:h-[calc(100vh-32px)] md:rounded-[34px] overflow-hidden bg-black shadow-[0_30px_90px_rgba(0,0,0,0.65)] border border-white/10">
                    {room.videoUrl ? (
                        <video
                            ref={videoRef}
                            src={room.videoUrl}
                            className="h-full w-full object-cover cursor-pointer bg-black"
                            loop
                            playsInline
                            onClick={togglePlay}
                            onLoadedMetadata={() => {
                                durationRef.current = Math.max(1, videoRef.current?.duration || 1);
                            }}
                            onPlay={startWatch}
                            onPause={stopWatch}
                            poster={room.thumbnail || room.images?.[0] || null}
                        />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-950 text-white">
                            Không có video
                        </div>
                    )}

                    {room.videoUrl && !isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-24 h-24 rounded-full bg-black/35 backdrop-blur-md flex items-center justify-center">
                                <PlayCircleFilled className="text-white text-7xl opacity-90" />
                            </div>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/55 pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

                    {room.isPromoted && (
                        <div className="absolute top-20 left-4 z-30 flex items-center gap-1.5 bg-gradient-to-r from-[#2563EB] to-[#38BDF8] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/15">
                            <FireFilled className="text-yellow-200" />
                            TIN ĐỀ XUẤT
                        </div>
                    )}

                    <div className="absolute bottom-7 left-4 right-[92px] text-white z-20">
                        <div className="inline-flex items-center gap-2 mb-3 cursor-pointer group" onClick={goToLandlordProfile}>
                            <Avatar
                                src={room.ownerAvatarSnapshot || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.ownerId || "host"}`}
                                size={42}
                                className="border-2 border-white/80 shadow-lg"
                            />

                            <div>
                                <div className="font-bold text-[15px] drop-shadow group-hover:underline">
                                    {room.ownerNameSnapshot || room.landlordName || "Chủ trọ"}
                                </div>
                                <div className="text-[11px] text-white/65">Chủ nhà đã xác thực</div>
                            </div>
                        </div>

                        <h3
                            className="text-white text-lg md:text-xl font-extrabold line-clamp-2 mb-2 drop-shadow cursor-pointer hover:text-[#93C5FD] transition-colors"
                            onClick={goToDetail}
                        >
                            {room.title}
                        </h3>

                        <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/15 px-3 py-1.5 mb-2">
                            <HomeFilled className="text-[#93C5FD]" />
                            <span className="text-[#BFDBFE] font-extrabold text-base">
                                {formatCurrency(room.price)}/tháng
                            </span>
                        </div>

                        <div className="text-xs text-white/75 line-clamp-1 flex items-center drop-shadow-md">
                            <EnvironmentOutlined className="mr-1 text-[#93C5FD]" />
                            {room.address}
                        </div>

                        <button
                            onClick={goToDetail}
                            className="mt-4 px-4 py-2 rounded-full bg-white text-slate-950 font-bold text-sm shadow-lg hover:bg-blue-50 transition"
                        >
                            Xem chi tiết phòng
                        </button>
                    </div>

                    <div className="absolute bottom-7 right-3 md:right-5 flex flex-col items-center gap-4 z-20">
                        <div className="relative mb-1">
                            <Avatar
                                src={room.ownerAvatarSnapshot || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.ownerId || "host"}`}
                                size={52}
                                className="border-2 border-white cursor-pointer shadow-xl"
                                onClick={goToLandlordProfile}
                            />

                            {user && String(currentUserId) !== String(room.ownerId) && (
                                <button
                                    onClick={handleToggleFollow}
                                    disabled={followLoading}
                                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-md transition-all ${isFollowingOwner ? "bg-emerald-500" : "bg-gradient-to-br from-[#2563EB] to-[#38BDF8]"
                                        }`}
                                >
                                    {isFollowingOwner ? (
                                        <CheckOutlined className="text-white text-[11px]" />
                                    ) : (
                                        <PlusOutlined className="text-white text-[11px]" />
                                    )}
                                </button>
                            )}
                        </div>

                        <ReelAction
                            active={isLiked}
                            activeClass="!bg-rose-500/95"
                            onClick={handleLike}
                            icon={<HeartFilled className="text-2xl md:text-3xl text-white" />}
                            label={formatCount(likeCount)}
                        />

                        <ReelAction
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenComments(room.id);
                            }}
                            icon={<MessageFilled className="text-2xl md:text-3xl text-white" />}
                            label={formatCount(displayCommentCount)}
                        />

                        <ReelAction
                            active={isSaved}
                            activeClass="!bg-blue-500/95"
                            onClick={handleSave}
                            icon={<BookFilled className="text-2xl md:text-3xl text-white" />}
                            label="Lưu"
                        />

                        <ReelAction
                            onClick={handleShare}
                            icon={<ShareAltOutlined className="text-2xl md:text-3xl text-white" />}
                            label="Chia sẻ"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReelsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const containerRef = useRef(null);

    const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
    const [activeCommentRoomId, setActiveCommentRoomId] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [replyingComment, setReplyingComment] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [submittingReply, setSubmittingReply] = useState(false);
    const [expandedReplies, setExpandedReplies] = useState({});

    useEffect(() => {
        fetchVideos();
    }, [id]);

    const getUserId = () => user?.id || user?.userId || user?.identityId;

    const getUserName = (item) => {
        if (!item) return "Người dùng";

        return (
            item.userProfile?.fullName ||
            item.userName ||
            item.fullName ||
            item.tenantName ||
            (item.userId ? `Thành viên ${item.userId}` : `Khách ${item.guestId?.substring(0, 5) || ""}`)
        );
    };

    const getAvatar = (item) =>
        item.userProfile?.avatarUrl ||
        item.avatarUrl ||
        item.tenantAvatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.userId || item.guestId || "guest"}`;

    const fetchVideos = async () => {
        setLoading(true);

        try {
            let guestId = localStorage.getItem("guestId");

            if (!guestId || isNaN(guestId) || String(guestId).startsWith("guest_")) {
                guestId = Date.now().toString();
                localStorage.setItem("guestId", guestId);
            }

            let finalUserId = getUserId();

            if (!finalUserId) {
                const userSessionId = sessionStorage.getItem("userSessionId");
                if (userSessionId) finalUserId = sessionStorage.getItem(`${userSessionId}_userId`);
            }

            finalUserId = finalUserId || guestId;

            let res;

            try {
                res = await recommendService.getFinalReelsFeed(finalUserId, 0, 50);
            } catch {
                res = await roomService.getVideoRooms({ size: 50 });
            }

            let data = res.data?.content || res.data?.items || res.data || [];
            data = Array.isArray(data) ? data : [];
            data = data.filter((room) => room.videoUrl && room.videoUrl.trim() !== "");

            if (id) {
                const numberId = Number(id);
                const index = data.findIndex((r) => Number(r.id) === numberId);

                if (index > 0) {
                    const item = data.splice(index, 1)[0];
                    data.unshift(item);
                } else if (index === -1) {
                    try {
                        const detailRes = await roomService.getRoomById(numberId);
                        const detailRoom = detailRes.data?.result || detailRes.data;
                        if (detailRoom?.videoUrl) data.unshift(detailRoom);
                    } catch { }
                }
            }

            const likedRoomIds = new Set();
            const savedRoomIds = new Set();

            const userSessionId = sessionStorage.getItem("userSessionId");
            const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;

            if (token) {
                try {
                    const [likedRes, savedRes] = await Promise.all([
                        favoriteService.getMyLikedProperties(0, 500),
                        favoriteService.getMySavedProperties(0, 500),
                    ]);

                    const likedContent =
                        likedRes.data?.content || likedRes.data?.result?.content || likedRes.data || [];
                    const savedContent =
                        savedRes.data?.content || savedRes.data?.result?.content || savedRes.data || [];

                    if (Array.isArray(likedContent)) {
                        likedContent.forEach((i) => likedRoomIds.add(i.propertyId || i.id));
                    }

                    if (Array.isArray(savedContent)) {
                        savedContent.forEach((i) => savedRoomIds.add(i.propertyId || i.id));
                    }
                } catch { }
            }

            const enrichedData = await Promise.all(
                data.map(async (item) => {
                    try {
                        const detailRes = await roomService.getRoomById(item.id);
                        const detailData = detailRes.data?.result || detailRes.data;

                        if (!detailData) return item;

                        const embeddedOwner = detailData.owner || detailData.ownerInfo;

                        return {
                            ...item,
                            ...detailData,
                            id: item.id,
                            images: detailData.images || item.images,
                            thumbnail: detailData.thumbnail || detailData.images?.[0] || item.thumbnail,
                            ownerSlug:
                                embeddedOwner?.slug ||
                                detailData.landlordSlug ||
                                item.ownerSlugSnapshot ||
                                null,
                            ownerId: detailData.ownerId || embeddedOwner?.id || item.ownerId,
                            likeCount: detailData.likeCount ?? item.likeCount ?? 0,
                            isLiked:
                                likedRoomIds.has(item.id) ||
                                detailData.isLiked ||
                                detailData.liked ||
                                item.isLiked ||
                                item.liked ||
                                false,
                            isSaved:
                                savedRoomIds.has(item.id) ||
                                detailData.isSaved ||
                                detailData.saved ||
                                item.isSaved ||
                                item.saved ||
                                false,
                        };
                    } catch {
                        return item;
                    }
                })
            );

            setVideos(enrichedData);
        } catch {
            message.error("Không thể tải danh sách video!");
            setVideos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;

            const { scrollTop, clientHeight } = containerRef.current;
            const index = Math.round(scrollTop / clientHeight);

            if (index !== activeIndex && index >= 0 && index < videos.length) {
                setActiveIndex(index);
            }
        };

        const container = containerRef.current;
        if (container) container.addEventListener("scroll", handleScroll);

        return () => {
            if (container) container.removeEventListener("scroll", handleScroll);
        };
    }, [videos, activeIndex]);

    const hydrateProfiles = async (items) => {
        const ids = [...new Set(items.map((item) => item.userId).filter(Boolean))];

        if (ids.length === 0) return items;

        const users = await Promise.all(
            ids.map((userId) =>
                userService
                    .getUserSummary(userId)
                    .then((r) => r.data)
                    .catch(() => null)
            )
        );

        const userMap = {};
        users.forEach((u) => {
            if (u?.id) userMap[u.id] = u;
        });

        return items.map((item) => ({
            ...item,
            userProfile: item.userId ? userMap[item.userId] : null,
        }));
    };

    const fetchReplies = async (commentId) => {
        try {
            const replyRes = await commentService.getReplies(commentId, 0, 20);

            let replies =
                replyRes.data?.content ||
                replyRes.data?.result?.content ||
                replyRes.data ||
                [];

            replies = Array.isArray(replies) ? replies : [];
            replies = await hydrateProfiles(replies);

            return replies;
        } catch {
            return [];
        }
    };

    const fetchComments = async (roomId) => {
        setCommentsLoading(true);

        try {
            const res = await commentService.getComments(roomId, 0, 50);

            let fetchedComments =
                res.data?.content || res.data?.result?.content || res.data || [];

            fetchedComments = Array.isArray(fetchedComments) ? fetchedComments : [];
            fetchedComments = await hydrateProfiles(fetchedComments);

            const commentsWithReplies = await Promise.all(
                fetchedComments.map(async (comment) => ({
                    ...comment,
                    replies: await fetchReplies(comment.id),
                }))
            );

            setComments(commentsWithReplies);

            const totalReplies = commentsWithReplies.reduce(
                (sum, item) => sum + (item.replies?.length || 0),
                0
            );

            const realTotal = Math.max(
                res.data?.totalElements || 0,
                commentsWithReplies.length + totalReplies
            );

            setVideos((prev) =>
                prev.map((v) =>
                    Number(v.id) === Number(roomId)
                        ? { ...v, commentCount: Math.max(Number(v.commentCount || 0), realTotal) }
                        : v
                )
            );
        } catch {
            message.error("Không thể tải danh sách bình luận!");
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleOpenComments = (roomId) => {
        setActiveCommentRoomId(roomId);
        setCommentDrawerOpen(true);
        setReplyingComment(null);
        setReplyText("");
        fetchComments(roomId);
    };

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;

        setSubmittingComment(true);

        try {
            await commentService.createComment({
                propertyId: activeCommentRoomId,
                content: newComment.trim(),
            });

            setNewComment("");

            setVideos((prev) =>
                prev.map((v) =>
                    Number(v.id) === Number(activeCommentRoomId)
                        ? { ...v, commentCount: Number(v.commentCount || 0) + 1 }
                        : v
                )
            );

            fetchComments(activeCommentRoomId);
        } catch {
            message.error("Không thể gửi bình luận!");
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleSubmitReply = async () => {
        if (!replyText.trim() || !replyingComment?.id) return;

        setSubmittingReply(true);

        try {
            await commentService.createComment({
                propertyId: activeCommentRoomId,
                parentId: replyingComment.id,
                replyToUserId: replyingComment.userId,
                content: replyText.trim(),
            });

            const parentId = replyingComment.id;

            setReplyText("");
            setReplyingComment(null);
            setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));

            setVideos((prev) =>
                prev.map((v) =>
                    Number(v.id) === Number(activeCommentRoomId)
                        ? { ...v, commentCount: Number(v.commentCount || 0) + 1 }
                        : v
                )
            );

            fetchComments(activeCommentRoomId);
        } catch {
            message.error("Không thể gửi phản hồi!");
        } finally {
            setSubmittingReply(false);
        }
    };

    const toggleReplies = (commentId) => {
        setExpandedReplies((prev) => ({
            ...prev,
            [commentId]: !prev[commentId],
        }));
    };

    const totalCommentCount = comments.reduce(
        (sum, item) => sum + 1 + (item.replies?.length || 0),
        0
    );

    return (
        <div className="fixed inset-0 bg-[#020617] z-[9999] overflow-hidden">
            <style>{`
        .reels-page-container::-webkit-scrollbar {
          display: none;
        }

        .reels-page-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .hv-shorts-drawer .ant-drawer-content-wrapper,
        .hv-shorts-drawer .ant-drawer-content,
        .hv-shorts-drawer .ant-drawer-wrapper-body,
        .hv-shorts-drawer .ant-drawer-header,
        .hv-shorts-drawer .ant-drawer-body {
          background: #020617 !important;
          color: #ffffff !important;
        }

        .hv-shorts-drawer .ant-drawer-content-wrapper {
          height: 84vh !important;
        }

        .hv-shorts-drawer .ant-drawer-content {
          border-top-left-radius: 28px !important;
          border-top-right-radius: 28px !important;
          overflow: hidden !important;
          border-top: 1px solid rgba(255,255,255,0.12) !important;
          box-shadow: 0 -24px 80px rgba(0,0,0,0.55) !important;
        }

        .hv-shorts-drawer .ant-drawer-header {
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
          padding: 16px 20px !important;
        }

        .hv-shorts-drawer .ant-drawer-body {
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .hv-shorts-drawer .ant-drawer-title {
          color: #ffffff !important;
        }

        .hv-shorts-drawer input {
          color: #ffffff !important;
          background: transparent !important;
        }

        .hv-shorts-drawer input::placeholder {
          color: rgba(255,255,255,0.45) !important;
        }

        .hv-shorts-drawer .ant-input {
          color: #ffffff !important;
          background: transparent !important;
        }

        .hv-shorts-drawer .ant-input::placeholder {
          color: rgba(255,255,255,0.45) !important;
        }
      `}</style>

            <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-lg transition"
                >
                    <ArrowLeftOutlined />
                </button>

                <div className="hidden sm:block text-white">
                    <div className="font-extrabold text-lg">HomeVerse Shorts</div>
                    <div className="text-xs text-white/50">Reels bất động sản</div>
                </div>
            </div>

            <button
                onClick={() => navigate("/")}
                className="absolute top-4 right-4 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-lg transition"
            >
                <CloseOutlined />
            </button>

            {loading ? (
                <div className="w-full h-screen flex justify-center items-center bg-[#020617]">
                    <Spin size="large" />
                    <span className="text-white ml-3">Đang tải Shorts...</span>
                </div>
            ) : videos.length === 0 ? (
                <div className="w-full h-screen flex flex-col justify-center items-center bg-[#020617] text-white px-6 text-center">
                    <div className="w-24 h-24 rounded-[32px] bg-white/10 border border-white/10 flex items-center justify-center mb-5">
                        <PlayCircleFilled className="text-6xl text-white/60" />
                    </div>

                    <div className="text-xl font-bold">Không có video nào để hiển thị</div>

                    <div className="text-sm text-white/45 mt-2 max-w-sm">
                        Hãy thêm video cho phòng trọ của bạn để xuất hiện tại HomeVerse Shorts.
                    </div>

                    <button
                        onClick={() => navigate("/")}
                        className="mt-6 px-5 py-2.5 rounded-full bg-white text-slate-950 font-bold hover:bg-blue-50 transition"
                    >
                        Quay về trang chủ
                    </button>
                </div>
            ) : (
                <div
                    ref={containerRef}
                    className="reels-page-container w-full h-screen overflow-y-scroll snap-y snap-mandatory bg-[#020617]"
                >
                    {videos.map((room, index) => (
                        <div key={room.id} className="w-full h-screen snap-center">
                            <ReelItem
                                room={room}
                                isActive={index === activeIndex}
                                onOpenComments={handleOpenComments}
                                user={user}
                            />
                        </div>
                    ))}
                </div>
            )}

            <Drawer
                placement="bottom"
                onClose={() => {
                    setCommentDrawerOpen(false);
                    setReplyingComment(null);
                    setReplyText("");
                }}
                open={commentDrawerOpen}
                visible={commentDrawerOpen}
                zIndex={10000}
                height="84vh"
                className="hv-shorts-drawer"
                rootClassName="hv-shorts-drawer"
                contentWrapperStyle={{ height: "84vh" }}
                drawerStyle={{
                    background: "#020617",
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    overflow: "hidden",
                }}
                headerStyle={{
                    background: "#020617",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
                bodyStyle={{
                    background: "#020617",
                    padding: 0,
                    color: "#fff",
                }}
                styles={{
                    wrapper: { height: "84vh" },
                    content: {
                        background: "#020617",
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        overflow: "hidden",
                        borderTop: "1px solid rgba(255,255,255,0.12)",
                    },
                    header: {
                        background: "#020617",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        padding: "16px 20px",
                    },
                    body: {
                        background: "#020617",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        color: "white",
                    },
                }}
                title={
                    <div className="text-white text-center">
                        <div className="font-extrabold text-base">{totalCommentCount} bình luận</div>
                        <div className="text-xs text-white/40 font-normal">Cộng đồng HomeVerse</div>
                    </div>
                }
                closeIcon={<CloseOutlined className="text-white text-lg" />}
            >
                <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 bg-[#020617] text-white">
                    {commentsLoading ? (
                        <div className="flex justify-center my-8">
                            <Spin />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center text-white/45 my-12">
                            <MessageFilled className="text-4xl mb-3 text-white/20" />
                            <div>Chưa có bình luận nào.</div>
                            <div className="text-xs mt-1">Hãy là người đầu tiên!</div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {comments.map((item) => {
                                const isExpanded = Boolean(expandedReplies[item.id]);
                                const replies = item.replies || [];
                                const visibleReplies = isExpanded ? replies : [];

                                return (
                                    <div key={item.id} className="flex gap-3">
                                        <Avatar src={getAvatar(item)} size={40} className="shrink-0" />

                                        <div className="flex-1 min-w-0">
                                            <div className="inline-block bg-white/10 border border-white/10 rounded-2xl px-3 py-2">
                                                <div className="text-[13px] text-white/75 font-bold mb-1">
                                                    {getUserName(item)}
                                                </div>

                                                <div className="text-[15px] text-white leading-relaxed break-words">
                                                    {item.content}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 mt-1.5 ml-2 text-[12px] text-white/40 font-semibold">
                                                <span>
                                                    {dayjs(
                                                        typeof item.createdAt === "string" && !item.createdAt.endsWith("Z")
                                                            ? item.createdAt + "Z"
                                                            : item.createdAt
                                                    ).fromNow()}
                                                </span>

                                                <button
                                                    className="text-white/50 hover:text-white"
                                                    onClick={() => {
                                                        setReplyingComment(item);
                                                        setReplyText("");
                                                    }}
                                                >
                                                    Trả lời
                                                </button>
                                            </div>

                                            {replies.length > 0 && (
                                                <button
                                                    className="mt-3 ml-2 text-[13px] text-white/45 font-bold flex items-center gap-2 hover:text-white"
                                                    onClick={() => toggleReplies(item.id)}
                                                >
                                                    <span className="inline-block w-8 h-px bg-white/25" />
                                                    {isExpanded ? "Ẩn câu trả lời" : `Xem ${replies.length} câu trả lời`}
                                                </button>
                                            )}

                                            {visibleReplies.length > 0 && (
                                                <div className="mt-3 ml-3 flex flex-col gap-3">
                                                    {visibleReplies.map((reply) => (
                                                        <div key={reply.id} className="flex gap-2">
                                                            <Avatar src={getAvatar(reply)} size={30} className="shrink-0" />

                                                            <div className="flex-1 min-w-0">
                                                                <div className="inline-block bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
                                                                    <div className="text-[12px] text-white/70 font-bold mb-0.5">
                                                                        {getUserName(reply)}
                                                                    </div>

                                                                    <div className="text-[14px] text-white leading-relaxed break-words">
                                                                        {reply.content}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 mt-1 ml-2 text-[12px] text-white/35 font-semibold">
                                                                    <span>
                                                                        {dayjs(
                                                                            typeof reply.createdAt === "string" && !reply.createdAt.endsWith("Z")
                                                                                ? reply.createdAt + "Z"
                                                                                : reply.createdAt
                                                                        ).fromNow()}
                                                                    </span>

                                                                    <button
                                                                        className="text-white/50 hover:text-white"
                                                                        onClick={() => {
                                                                            setReplyingComment(item);
                                                                            setReplyText(`@${getUserName(reply)} `);
                                                                        }}
                                                                    >
                                                                        Trả lời
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-[#020617] backdrop-blur-xl border-t border-white/10 px-3 py-3">
                    {replyingComment && (
                        <div className="flex items-center justify-between text-xs text-white/45 mb-2 px-2">
                            <span>Đang trả lời {getUserName(replyingComment)}</span>

                            <button
                                className="text-white/75 hover:text-white"
                                onClick={() => {
                                    setReplyingComment(null);
                                    setReplyText("");
                                }}
                            >
                                Hủy
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Avatar
                            size={36}
                            src={
                                user?.avatarUrl ||
                                user?.avatar ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${getUserId() || "guest"}`
                            }
                            className="shrink-0"
                        />

                        <div className="flex-1 bg-white/10 border border-white/10 rounded-full flex items-center px-4 h-12">
                            <Input
                                bordered={false}
                                placeholder={
                                    replyingComment
                                        ? `Trả lời ${getUserName(replyingComment)}...`
                                        : "Thêm bình luận..."
                                }
                                value={replyingComment ? replyText : newComment}
                                onChange={(e) =>
                                    replyingComment ? setReplyText(e.target.value) : setNewComment(e.target.value)
                                }
                                onPressEnter={replyingComment ? handleSubmitReply : handleSubmitComment}
                                style={{
                                    background: "transparent",
                                    color: "#fff",
                                    padding: 0,
                                }}
                            />

                            <SmileOutlined className="text-white/45 text-xl ml-2" />
                        </div>

                        <Button
                            type="primary"
                            shape="circle"
                            icon={<SendOutlined />}
                            loading={replyingComment ? submittingReply : submittingComment}
                            disabled={replyingComment ? !replyText.trim() : !newComment.trim()}
                            onClick={replyingComment ? handleSubmitReply : handleSubmitComment}
                            className="bg-[#2563EB] hover:!bg-[#1D4ED8] border-none flex items-center justify-center shadow-lg"
                        />
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

export default ReelsPage;