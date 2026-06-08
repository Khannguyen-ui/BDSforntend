import React, { useState, useEffect, useRef } from 'react';
import { Modal, Spin, message, Avatar, Tooltip } from 'antd';
import {
  HeartFilled,
  MessageFilled,
  ShareAltOutlined,
  BookFilled,
  CloseOutlined,
  PlayCircleFilled,
  EnvironmentOutlined,
  FireFilled
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import roomService from '../../services/roomService';
import recommendService from '../../services/recommendService';
import useAuth from '../../hooks/useAuth';
import favoriteService from '../../services/favoriteService';
import commentService from '../../services/commentService';
import { formatCurrency } from '../../utils/format';
import { Drawer, Input, Button } from 'antd';
import customerservice from '../../services/userService';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const ReelItem = ({ room, isActive, onOpenComments, user }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(room.isLiked || false);
  const [isSaved, setIsSaved] = useState(room.isSaved || false);
  const [likeCount, setLikeCount] = useState(room.likeCount || 0);
  const [localCommentCount, setLocalCommentCount] = useState(0);
  const navigate = useNavigate();
  const buildReelMetadata = (room) => ({
    itemType: 'REEL',
    duration: 1,
    watchTime: 1,
    price: room?.price || 0,
    userBudget: room?.price || 0,
    province: room?.province || '',
    ward: room?.ward || '',
    district: room?.district || '',
    locationMatch: room?.district ? 1 : 0,
    categoryMatch: room?.propertyType ? 1 : 0
  });
  useEffect(() => {
    if (!isActive || !room?.id) return;

    roomService.trackView(room.id);

    if (!user) {
      recommendService.trackBehavior(
        room.id,
        'REEL',
        'VIEW',
        buildReelMetadata(room)
      ).catch(e => console.warn("Recommend REEL VIEW failed:", e));
    }
  }, [isActive, room?.id, user]);

  useEffect(() => {
    // Fetch comment count
    commentService.countComments(room.id).then(res => {
      const fetchedCount = res.data || res || 0;
      setLocalCommentCount(Number(fetchedCount));
    }).catch(e => console.log('Lỗi lấy số lượng comment', e));
  }, [room.id]);

  const displayCommentCount = Math.max(localCommentCount, Number(room.commentCount || 0));

  useEffect(() => {
    if (!room.videoUrl) return;

    if (isActive) {
      if (videoRef.current) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log('Autoplay blocked:', e));
      }
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive, room.videoUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();

    const nextLiked = !isLiked;

    try {
      await favoriteService.toggleLike(room.id, buildReelMetadata(room));
      setIsLiked(nextLiked);
      setLikeCount(prev => nextLiked ? prev + 1 : Math.max(0, prev - 1));
    } catch (error) {
      console.error("Lỗi like reel:", error);
      message.error("Thao tác thất bại");
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();

    const nextSaved = !isSaved;

    try {
      await favoriteService.toggleSave(room.id, buildReelMetadata(room));
      setIsSaved(nextSaved);
    } catch (error) {
      console.error("Lỗi save reel:", error);
      message.error("Thao tác thất bại");
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/rooms/${room.id}`);
    message.success('Đã sao chép liên kết phòng trọ!');
  };

  const goToDetail = (e) => {
    e.stopPropagation();
    navigate(`/rooms/${room.id}`);
  };

  const goToLandlordProfile = (e) => {
    e.stopPropagation();
    const targetSlug = room.ownerSlug || room.ownerId; // Sử dụng slug thẩm mỹ/SEO, fallback về ID
    if (targetSlug) {
      navigate(`/users/public-profile/${targetSlug}`);
    } else {
      message.warning('Thông tin chủ trọ đang được cập nhật!');
    }
  };

  return (
    <div className="relative w-full h-full bg-transparent snap-center flex justify-center items-center overflow-hidden">
      {room.videoUrl && (
        <video
          ref={videoRef}
          src={room.videoUrl}
          className="w-full h-full object-cover cursor-pointer"
          loop
          playsInline
          onClick={togglePlay}
          poster={room.thumbnail || (room.images && room.images.length > 0 ? room.images[0] : null)}
        />
      )}

      {/* Play Icon Overlay if Paused */}
      {room.videoUrl && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <PlayCircleFilled className="text-white text-6xl opacity-70" />
        </div>
      )}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* 🔥 VIP Badge — góc trên trái */}
      {room.isPromoted && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
          <FireFilled className="text-yellow-200" />
          TIN HOT
        </div>
      )}

      {/* Info Overlay (Bottom Left) */}
      <div className="absolute bottom-6 left-4 right-16 text-white z-20 pointer-events-none">
        <div className="flex items-center gap-2 mb-2 pointer-events-auto cursor-pointer" onClick={goToLandlordProfile}>
          <Avatar src={room.ownerAvatarSnapshot || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.ownerId || 'host'}`} size={40} className="border border-white" />
          <span className="font-bold text-base drop-shadow-md hover:underline">{room.ownerNameSnapshot || 'Chủ trọ'}</span>
        </div>

        <h3 className="text-white text-sm md:text-base font-bold line-clamp-2 mb-1 drop-shadow-md pointer-events-auto cursor-pointer hover:text-[#f96302] transition-colors" onClick={goToDetail}>
          {room.title}
        </h3>

        <div className="text-orange-400 font-bold text-lg drop-shadow-md mb-1">
          {formatCurrency(room.price)}/tháng
        </div>

        <div className="text-xs text-gray-200 line-clamp-1 flex items-center drop-shadow-md">
          <EnvironmentOutlined className="mr-1" /> {room.address}
        </div>
      </div>

      {/* Action Overlay (Right Side) */}
      <div className="absolute bottom-6 right-2 md:right-4 flex flex-col items-center gap-5 z-20">
        <div className="relative mb-2 pointer-events-auto cursor-pointer" onClick={goToLandlordProfile}>
          <Avatar src={room.ownerAvatarSnapshot || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.ownerId || 'host'}`} size={46} className="border-2 border-white" />
        </div>

        <div className="flex flex-col items-center pointer-events-auto cursor-pointer group hover:scale-110 transition-transform" onClick={handleLike}>
          <HeartFilled className={`text-4xl drop-shadow-lg transition-colors duration-300 ${isLiked ? 'text-red-500' : 'text-white'}`} />
          <span className="text-white text-xs mt-1 font-semibold drop-shadow-md">{likeCount > 0 ? likeCount.toLocaleString() : '0'}</span>
        </div>

        <div className="flex flex-col items-center pointer-events-auto cursor-pointer group hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); onOpenComments(room.id); }}>
          <MessageFilled className="text-4xl text-white drop-shadow-lg" />
          <span className="text-white text-xs mt-1 font-semibold drop-shadow-md">{displayCommentCount > 0 ? displayCommentCount.toLocaleString() : '0'}</span>
        </div>

        <div className="flex flex-col items-center pointer-events-auto cursor-pointer group hover:scale-110 transition-transform" onClick={handleSave}>
          <BookFilled className={`text-4xl drop-shadow-lg transition-colors duration-300 ${isSaved ? 'text-yellow-400' : 'text-white'}`} />
          <span className="text-white text-xs mt-1 font-semibold drop-shadow-md">Lưu</span>
        </div>

        <div className="flex flex-col items-center pointer-events-auto cursor-pointer group hover:scale-110 transition-transform" onClick={handleShare}>
          <ShareAltOutlined className="text-4xl text-white drop-shadow-lg" />
          <span className="text-white text-xs mt-1 font-semibold drop-shadow-md">Chia sẻ</span>
        </div>
      </div>
    </div>
  );
};

const ReelsViewer = ({ isOpen, onClose, initialRoomId = null }) => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  // Comment States
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [activeCommentRoomId, setActiveCommentRoomId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    } else {
      setVideos([]);
      setActiveIndex(0);
    }
  }, [isOpen, initialRoomId]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      let guestId = localStorage.getItem('guestId');
      if (!guestId || isNaN(guestId) || String(guestId).startsWith('guest_')) {
        guestId = Date.now().toString();
        localStorage.setItem('guestId', guestId);
      }

      let finalUserId = user?.id;
      if (!finalUserId) {
        const userSessionId = sessionStorage.getItem('userSessionId');
        if (userSessionId) {
          finalUserId = sessionStorage.getItem(`${userSessionId}_userId`);
        }
      }
      finalUserId = finalUserId || guestId;

      // 🔥 LẤY VIDEO TỪ API REELS CỦA RECOMMEND SERVICE
      let res;
      try {
        res = await recommendService.getFinalReelsFeed(finalUserId, 0, 50);
      } catch (err) {
        //console.warn("Lỗi Recommend API Reels, tự động fallback sang Video API:", err);
        res = await roomService.getVideoRooms({ size: 50 });
      }
      let data = res.data?.content || res.data?.items || res.data || [];
      //console.log("=== Dữ liệu gốc từ API ===", data);

      // ✅ LỌC CHỈ LẤY PROPERTIES CÓ VIDEO
      data = data.filter(room => room.videoUrl && room.videoUrl.trim() !== '');

      // Nếu có initialRoomId thì ưu tiên hiển thị trước
      if (initialRoomId) {
        const index = data.findIndex(r => r.id === initialRoomId);
        if (index > 0) {
          const item = data.splice(index, 1)[0];
          data.unshift(item);
        } else if (index === -1) {
          // Thử lấy chi tiết nếu chưa có trong list
          try {
            const detailRes = await roomService.getRoomById(initialRoomId);
            const detailRoom = detailRes.data?.result || detailRes.data;
            if (detailRoom && detailRoom.videoUrl) {
              data.unshift(detailRoom);
            }
          } catch (e) {
            //console.error("Lỗi lấy chi tiết phòng:", e);
          }
        }
      }

      // Fetch danh sách đã thích/lưu của user để chắc chắn có trạng thái chính xác
      let likedRoomIds = new Set();
      let savedRoomIds = new Set();
      const userSessionId = sessionStorage.getItem('userSessionId');
      const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;
      if (token) {
        try {
          const [likedRes, savedRes] = await Promise.all([
            favoriteService.getMyLikedProperties(0, 500),
            favoriteService.getMySavedProperties(0, 500)
          ]);
          const likedContent = likedRes.data?.content || likedRes.data?.result?.content || likedRes.data || [];
          const savedContent = savedRes.data?.content || savedRes.data?.result?.content || savedRes.data || [];

          if (Array.isArray(likedContent)) likedContent.forEach(i => likedRoomIds.add(i.propertyId || i.id));
          if (Array.isArray(savedContent)) savedContent.forEach(i => savedRoomIds.add(i.propertyId || i.id));
        } catch (e) {
          //console.warn("Lỗi lấy danh sách đã thích/lưu:", e);
        }
      }

      // NÂNG CẤP FRONTEND THÔNG MINH:
      // Gọi song song API chi tiết để làm giàu ảnh/thumbnail cho Reels
      const enrichedData = await Promise.all(
        data.map(async (item) => {
          try {
            const detailRes = await roomService.getRoomById(item.id);
            const detailData = detailRes.data?.result || detailRes.data;
            //console.log(`=== Dữ liệu chi tiết từ API cho phòng ${item.id} ===`, detailData);
            if (detailData) {
              const embeddedOwner = detailData.owner || detailData.ownerInfo;
              const mappedRoom = {
                ...item,
                ...detailData,
                id: item.id,
                images: detailData.images || item.images,
                thumbnail: detailData.thumbnail || (detailData.images && detailData.images.length > 0 ? detailData.images[0] : null) || item.thumbnail,
                ownerSlug: embeddedOwner?.slug || detailData.landlordSlug || item?.ownerSlugSnapshot || null,
                ownerId: detailData.ownerId || embeddedOwner?.id || item.ownerId,
                likeCount: detailData.likeCount ?? item.likeCount ?? 0,
                isLiked: likedRoomIds.has(item.id) || detailData.isLiked || detailData.liked || item.isLiked || item.liked || false,
                isSaved: savedRoomIds.has(item.id) || detailData.isSaved || detailData.saved || item.isSaved || item.saved || false
              };
              //console.log(`Phòng ${item.id} => Số Like từ Recommend API: ${item.likeCount} | Số Like từ Detail API: ${detailData.likeCount}`);
              return mappedRoom;
            }
          } catch (e) {
            //console.warn("Lỗi làm giàu Reels:", e);
          }
          return item;
        })
      );
      //console.log("=== Danh sách Video hiển thị ===", enrichedData);

      setVideos(enrichedData);
    } catch (error) {
      //console.error("Lỗi lấy danh sách video:", error);
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
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [videos, activeIndex]);

  // Comment Drawer logic
  const handleOpenComments = async (roomId) => {
    setActiveCommentRoomId(roomId);
    setCommentDrawerOpen(true);
    fetchComments(roomId);
  };

  const fetchComments = async (roomId) => {
    setCommentsLoading(true);
    try {
      const res = await commentService.getComments(roomId, 0, 50);
      let fetchedComments = res.data?.content || res.data || [];

      const uniqueUserIds = [...new Set(fetchedComments.map(c => c.userId).filter(Boolean))];
      if (uniqueUserIds.length > 0) {
        const userPromises = uniqueUserIds.map(id => customerservice.getUserSummary(id).then(r => r.data).catch(() => null));
        const users = await Promise.all(userPromises);
        const userMap = {};
        users.forEach(u => {
          if (u && u.id) userMap[u.id] = u;
        });
        fetchedComments = fetchedComments.map(c => ({
          ...c,
          userProfile: c.userId ? userMap[c.userId] : null
        }));
      }

      setComments(fetchedComments);

      const realTotal = Math.max(res.data?.totalElements || 0, fetchedComments.length);
      setVideos(prev => prev.map(v => Number(v.id) === Number(roomId) ? { ...v, commentCount: Math.max(Number(v.commentCount || 0), realTotal) } : v));
    } catch (error) {
      //console.error("Lỗi tải bình luận:", error);
      message.error("Không thể tải danh sách bình luận!");
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await commentService.createComment({
        propertyId: activeCommentRoomId,
        content: newComment
      });
      setNewComment('');

      // Cập nhật tăng số đếm ngay lập tức ở giao diện bên ngoài
      setVideos(prev => prev.map(v => Number(v.id) === Number(activeCommentRoomId) ? { ...v, commentCount: Math.max(Number(v.commentCount || 0) + 1, 1) } : v));

      fetchComments(activeCommentRoomId);
    } catch (error) {
      //console.error("Lỗi gửi bình luận:", error);
      message.error("Không thể gửi bình luận!");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        /* Chống cuộn toàn trang (khóa scrollbar của trình duyệt) */
        .reels-modal-wrap, div.ant-modal-wrap {
          overflow: hidden !important;
        }
        .reels-container::-webkit-scrollbar {
          display: none;
        }
        .reels-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <Modal
        open={isOpen}
        onCancel={onClose}
        footer={null}
        closable={false}
        maskClosable={false}
        className="reels-modal"
        wrapClassName="reels-modal"
        width={400}
        style={{ top: 0, padding: 0, margin: 0, paddingBottom: 0 }}
        styles={{
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' },
          body: { padding: 0, height: '100vh', backgroundColor: 'black', borderRadius: '16px', overflow: 'hidden', position: 'relative' },
          content: { padding: 0, backgroundColor: 'black', borderRadius: '16px', overflow: 'hidden' }
        }}
        modalRender={(node) =>
          React.cloneElement(node, {
            style: {
              ...node.props.style,
              backgroundColor: 'black',
              padding: 0,
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }
          })
        }
        centered
        destroyOnHidden
      >
        {/* Nút Đóng Custom đẹp hơn, không viền, nổi bật */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 flex items-center justify-center p-2 text-white hover:text-gray-300 transition-colors drop-shadow-2xl cursor-pointer hover:scale-110"
        >
          <CloseOutlined className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </button>



        {loading ? (
          <div className="w-full h-full flex justify-center items-center bg-transparent">
            <Spin size="large" />
            <div className="text-white mt-4 ml-3">Đang tải...</div>
          </div>
        ) : videos.length === 0 ? (
          <div className="w-full h-full flex flex-col justify-center items-center bg-transparent text-white">
            <PlayCircleFilled className="text-6xl text-gray-600 mb-4" />
            <div className="text-lg">Không có video nào để hiển thị.</div>
            <div className="text-sm text-gray-500 mt-2">Hãy thêm video cho phòng trọ của bạn để xuất hiện tại đây!</div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="reels-container w-full h-full overflow-y-scroll snap-y snap-mandatory bg-black relative rounded-2xl"
          >
            {videos.map((room, index) => (
              <div key={room.id} className="w-full h-full snap-center">
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
      </Modal>

      {/* Comment Drawer */}
      <Drawer
        title={<span className="font-bold text-lg">Bình luận</span>}
        placement="bottom"
        onClose={() => setCommentDrawerOpen(false)}
        open={commentDrawerOpen}
        className="rounded-t-2xl"
        styles={{
          wrapper: { height: '70vh' },
          body: { padding: '0', display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }
        }}
        closeIcon={<CloseOutlined className="text-xl" />}
      >
        <div className="flex-1 overflow-y-auto p-4 pb-20">
          {commentsLoading ? (
            <div className="flex justify-center my-8">
              <Spin />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-500 my-8">
              Chưa có bình luận nào. Hãy là người đầu tiên!
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {comments.map((item) => (
                <div key={item.id} className="flex gap-3 items-start py-2 border-b border-gray-100 last:border-0">
                  <Avatar
                    src={item.userProfile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.userId || item.guestId || 'guest'}`}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-sm text-gray-800 truncate pr-2">
                        {item.userId
                          ? (item.userProfile?.fullName || `Thành viên ${item.userId}`)
                          : `Khách ${item.guestId?.substring(0, 5) || ''}`}
                      </span>
                      <span className="text-xs text-gray-400 font-normal whitespace-nowrap">
                        {dayjs(typeof item.createdAt === 'string' && !item.createdAt.endsWith('Z') ? item.createdAt + 'Z' : item.createdAt).fromNow()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 break-words">
                      {item.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex items-center shadow-lg">
          <Input
            placeholder="Thêm bình luận..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onPressEnter={handleSubmitComment}
            className="flex-1 rounded-full px-4 py-2 bg-gray-100 border-none hover:bg-gray-200 focus:bg-white"
          />
          <Button
            type="primary"
            shape="circle"
            icon={<MessageFilled />}
            loading={submittingComment}
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            className="ml-3 bg-orange-500 hover:bg-orange-600 border-none flex items-center justify-center"
          />
        </div>
      </Drawer>
    </>
  );
};

export default ReelsViewer;