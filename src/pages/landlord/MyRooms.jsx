import React, { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Tag, Space, Popconfirm, Typography,
  Image, Modal, Form, Input, InputNumber, Select, Row, Col, Tabs, Upload, Tooltip, Switch, App
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined,
  ExclamationCircleOutlined, UploadOutlined, VideoCameraOutlined,
  ClockCircleOutlined, RocketOutlined, CheckCircleOutlined, FireFilled,
  StopOutlined, ReloadOutlined, EyeInvisibleOutlined,
  CheckCircleFilled, UndoOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import roomService from '../../services/roomService';
import useAuth from '../../hooks/useAuth'; // Thêm Hook lấy user
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const MyRooms = () => {
  const { user } = useAuth(); // Lấy thông tin chủ trọ
  const { message, modal } = App.useApp(); // Dùng thẻ message động để fix vụ warning

  // --- STATE DỮ LIỆU ---
  const [rooms, setRooms] = useState([]);
  const [trashRooms, setTrashRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // --- STATE MODAL SỬA TIN ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [fileList, setFileList] = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);

  // --- STATE MODAL ĐẨY TIN ---
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [pushPackages, setPushPackages] = useState([]);
  const [selectedRoomToPush, setSelectedRoomToPush] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [pushLoading, setPushLoading] = useState(false);

  const [form] = Form.useForm();
  const navigate = useNavigate();

  const currentVideoUrl = Form.useWatch('videoUrl', form);

  // 1. API: Lấy dữ liệu
  const fetchMyRooms = async () => {
    if (!user?.id) return; // Bảo đảm gọi API truyền đúng OwnerID
    setLoading(true);
    try {
      const res = await roomService.getMyRooms(user.id);
      console.log("🔥 GET MY ROOMS API RESPONSE:", res.data);


      const rawData = res.data?.content || res.data?.result?.content || res.data?.data?.content || res.data?.result || res.data?.data || res.data;
      const arrayData = Array.isArray(rawData) ? rawData : (rawData?.content || []);

      // Tự động Parse mảng ảnh nếu Backend đang trả về dạng chuỗi JSON String
      const parsedData = arrayData.map(room => {
        let parsedImages = room.images || [];
        if (typeof parsedImages === 'string') {
          try {
            parsedImages = JSON.parse(parsedImages);
            if (!Array.isArray(parsedImages)) parsedImages = [];
          } catch (e) {
            parsedImages = [room.images];
          }
        }
        return { ...room, images: parsedImages };
      });

      console.log("🔥 BÓC TÁCH THÀNH MẢNG:", parsedData);
      setRooms(parsedData);
    } catch (error) {
      console.error("Lỗi tải danh sách phòng:", error);
      message.error("Lỗi tải danh sách phòng");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTrash = async () => {
    setLoading(true);
    try {
      const res = await roomService.getMyTrash(0, 100);
      const rawData = res.data?.content || res.data?.result?.content || res.data?.result || res.data?.data || [];
      const arrayData = Array.isArray(rawData) ? rawData : [];

      const parsedData = arrayData.map(room => {
        let parsedImages = room.images || [];
        if (typeof parsedImages === 'string') {
          try { parsedImages = JSON.parse(parsedImages); if (!Array.isArray(parsedImages)) parsedImages = []; }
          catch (e) { parsedImages = [room.images]; }
        }
        return { ...room, images: parsedImages };
      });
      setTrashRooms(parsedData);
    } catch (error) {
      console.error("Lỗi tải thùng rác:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAmenities = async () => {
    try {
      const res = await roomService.getAllAmenities();
      const rawData = res.data?.result || res.data;
      const arrayData = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      setAmenitiesList(arrayData);
    } catch (error) { console.error("Lỗi tải tiện ích:", error); }
  };

  // API lấy gói đẩy tin
  const fetchPushPackages = async () => {
    try {
      const res = await roomService.getAllPackages();
      const rawData = res.data?.result || res.data;
      const arrayData = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      const pushes = arrayData
        .filter(p => p.type === 'ROOM_PROMOTION')
        .sort((a, b) => (a.priorityLevel || 0) - (b.priorityLevel || 0));
      setPushPackages(pushes);
    } catch (error) { console.error("Lỗi tải Packages:", error); }
  };

  useEffect(() => {
    if (user?.id) {
      if (filterStatus === 'TRASH') {
        fetchMyTrash();
      } else {
        fetchMyRooms();
      }
    }
    fetchAmenities();
    fetchPushPackages();
  }, [user?.id, filterStatus]);

  // 2. Upload Handlers
  const handleUploadImage = async ({ file, onSuccess, onError }) => {
    try {
      const res = await roomService.uploadImage(file);
      const resultData = res.data?.result || res.data?.data || res.data;
      const finalUrl = typeof resultData === 'string' ? resultData : resultData?.url;

      if (!finalUrl || typeof finalUrl !== 'string' || !finalUrl.startsWith('http')) {
        const debugStr = JSON.stringify(res.data).substring(0, 100);
        message.error(`Lỗi cấu trúc API: ${debugStr}`);
        throw new Error("URL không hợp lệ: " + finalUrl);
      }

      onSuccess(finalUrl);
    } catch (err) {
      console.error("Upload ảnh lỗi:", err);
      onError(err);
    }
  };

  const handleUploadVideo = async ({ file, onSuccess, onError }) => {
    // 🚀 Bỏ qua Backend để tránh lỗi ERR_CONNECTION_RESET (giới hạn 10MB của Tomcat)
    // Thực hiện Upload trực tiếp từ Frontend lên Cloudinary & nhờ Cloudinary nén Video
    setVideoLoading(true);
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = "homeverse/properties";
      const eager = "c_pad,h_1280,w_720,f_mp4"; // Yêu cầu Cloudinary nén Video
      const apiSecret = "M8lZ0g_OPg4eLH0qh2BC-zMRaxQ";
      const apiKey = "448443126664466";
      const cloudName = "dfyrnocnr";

      // 1. Tạo chữ ký bảo mật SHA-1 (Phải theo thứ tự Alphabet)
      const stringToSign = `eager=${eager}&folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const msgBuffer = new TextEncoder().encode(stringToSign);
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // 2. Gọi API thẳng lên Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("folder", folder);
      formData.append("eager", eager);
      formData.append("signature", signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      // 3. Lấy URL của video ĐÃ NÉN (eager url) thay vì video gốc (secure_url)
      const compressedUrl = data.eager && data.eager.length > 0 ? data.eager[0].secure_url : data.secure_url;

      form.setFieldsValue({ videoUrl: compressedUrl });
      onSuccess("ok");
      message.success("Tải lên và nén video thành công!");
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      onError(err);
      message.error("Lỗi upload video: Hệ thống từ chối kết nối hoặc mạng yếu.");
    } finally {
      setVideoLoading(false);
    }
  };


  // Xử lý Bật/Tắt Tự động gia hạn
  const handleAutoRenewChange = async (checked, room) => {
    try {
      // Gọi API Backend: PUT /api/rooms/{id}/auto-renew?enable={true/false}
      await roomService.toggleAutoRenew(room.id, checked);
      message.success(`Đã ${checked ? 'BẬT' : 'TẮT'} tự động gia hạn cho tin: ${room.title}`);
      fetchMyRooms(); // Load lại data để cập nhật UI
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi cập nhật cấu hình");
    }
  };

  // Xử lý Ẩn Tin / Đăng Lại (Hạ tin)
  const handleStatusToggle = async (room) => {
    const isExpired = room.status === 'EXPIRED' || (room.expiresAt && dayjs().isAfter(dayjs(room.expiresAt)));

    if (isExpired) {
      Modal.confirm({
        title: 'Tin đã hết hạn!',
        if(isExpired) {
          Modal.warning({
            title: 'Tin đã hết hạn!',
            content: 'Tin này đã hết hạn hiển thị. Vui lòng gia hạn hoặc đăng lại tin trước khi mua gói đẩy tin.',
            okText: 'Đã hiểu'
          });
          return;
        }
      });
      return;
    }

    const isHidden = room.status === 'HIDDEN';
    const newStatus = isHidden ? 'ACTIVE' : 'HIDDEN';
    const actionText = isHidden ? 'Đăng lại tin' : 'Ẩn tin';

    try {
      await roomService.updateRoomStatus(room.id, newStatus);
      message.success(`Thành công: ${actionText}`);
      fetchMyRooms();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi cập nhật trạng thái");
    }
  };

  // ============================================================

  const canPushRoom = (room) => {
    const isExpired =
      room.status === 'EXPIRED' ||
      (room.expiresAt && dayjs().isAfter(dayjs(room.expiresAt)));

    return room.status === 'ACTIVE' && !isExpired;
  };

  const getPushDisabledReason = (room) => {
    if (room.status === 'PENDING') {
      return 'Tin đang chờ duyệt, chưa thể mua gói đẩy tin.';
    }

    if (room.status === 'REJECTED') {
      return 'Tin đã bị từ chối, không thể mua gói đẩy tin.';
    }

    if (room.status === 'HIDDEN') {
      return 'Tin đang ẩn, hãy đăng lại tin trước khi đẩy tin.';
    }

    if (room.status === 'EXPIRED' || (room.expiresAt && dayjs().isAfter(dayjs(room.expiresAt)))) {
      return 'Tin đã hết hạn, không thể mua gói đẩy tin.';
    }

    return 'Chỉ có thể đẩy tin khi bài đã được duyệt và đang hiển thị.';
  };

  const handleOpenPushModal = (room) => {
    if (!canPushRoom(room)) {
      message.warning(getPushDisabledReason(room));
      return;
    }

    setSelectedRoomToPush(room);
    setSelectedPackageId(null);
    setIsPushModalOpen(true);
  };

  const handlePushPayment = async () => {
    if (!selectedPackageId) {
      message.warning("Vui lòng chọn gói đẩy tin!");
      return;
    }
    const pkg = pushPackages.find(p => p.id === selectedPackageId);
    if (!selectedRoomToPush || !canPushRoom(selectedRoomToPush)) {
      message.warning(getPushDisabledReason(selectedRoomToPush || {}));
      setIsPushModalOpen(false);
      return;
    }

    modal.confirm({
      title: 'Xác nhận thanh toán',
      content: (
        <div>
          <p>Mua gói: <b>{pkg?.name}</b></p>
          <p>Cho tin: <b>{selectedRoomToPush?.title}</b></p>
          <div className="flex justify-between font-bold text-[#f96302] border-t pt-2 mt-2">
            <span>Thành tiền:</span>
            <span>{pkg?.price?.toLocaleString()} đ</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            * Nếu tin đang có gói VIP, gói mới sẽ được xếp hàng và tự động kích hoạt sau khi gói hiện tại hết hạn.
          </div>
        </div>
      ),
      okText: 'Thanh toán',
      cancelText: 'Hủy',
      okButtonProps: { className: 'bg-[#f96302] border-[#f96302]' },
      centered: true,
      onOk: async () => {
        try {
          setPushLoading(true);
          await roomService.pushRoom(selectedRoomToPush.id, selectedPackageId);
          message.success("Đẩy tin thành công! Tin đã lên Top.");
          setIsPushModalOpen(false);
          fetchMyRooms();
        } catch (error) {
          console.error(" CHI TIẾT LỖI THANH TOÁN:", error);
          const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || '';
          const lowerMsg = errorMsg.toLowerCase();

          const isInsufficient =
            lowerMsg.includes('số dư') ||
            lowerMsg.includes('không đủ tiền') ||
            lowerMsg.includes('balance') ||
            lowerMsg.includes('insufficient');
          if (isInsufficient) {
            Modal.warning({
              title: 'Số dư ví không đủ!',
              content: 'Số dư ví khả dụng của bạn hiện tại không đủ để mua gói đẩy tin này. Vui lòng nạp thêm tiền vào ví để tiếp tục.',
              okText: 'Nạp tiền ngay',
              cancelText: 'Hủy',
              okButtonProps: { className: 'bg-blue-600 border-blue-600 text-white' },
              onOk: () => {
                setIsPushModalOpen(false);
                navigate('/landlord/finance');
              }
            });
          } else {
            if (error.response) {
              const backendError = error.response.data?.error || error.response.data?.message;
              message.error(backendError || `Lỗi từ server: Mã ${error.response.status}`);
            } else if (error.request) {
              message.error("Không thể kết nối đến Backend. Vui lòng kiểm tra server hoặc CORS!");
            } else {
              message.error("Lỗi Frontend: " + error.message);
            }
          }
        } finally {
          setPushLoading(false);
        }
      }
    });
  };

  // --- LOGIC EDIT/DELETE ---
  const handleEditClick = (record) => {
    setEditingRoom(record);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (isModalOpen) {
      if (editingRoom) {
        // Map amenities sang mảng name thuần (do backend lưu chuỗi name)
        const rawNames = (editingRoom.amenities || []).map(item =>
          typeof item === 'object' ? item.name : item
        );
        const uniqueNames = [...new Set(rawNames)].filter(Boolean);
        const initialImages = (editingRoom.images || []).map((url, index) => ({
          uid: `-${index}`, name: `Ảnh ${index + 1}`, status: 'done', url: url
        }));
        setFileList(initialImages);
        form.setFieldsValue({
          title: editingRoom.title,
          propertyType: editingRoom.propertyType,
          transactionType: editingRoom.transactionType,
          address: editingRoom.address,
          price: editingRoom.price,
          deposit: editingRoom.deposit,
          area: editingRoom.area,
          capacity: editingRoom.capacity,
          bedrooms: editingRoom.bedrooms,
          bathrooms: editingRoom.bathrooms,
          furnishingStatus: editingRoom.furnishingStatus,
          description: editingRoom.description,
          videoUrl: editingRoom.videoUrl,
          amenities: uniqueNames, // Mảng name sạch để Select hiển thị đúng
        });
      } else {
        form.resetFields();
        setFileList([]);
      }
    }
  }, [isModalOpen, editingRoom, form]);

  const handleUpdateSubmit = async () => {
    try {
      const values = await form.validateFields();

      const doSubmit = async () => {
        setUpdateLoading(true);
        try {
          const finalImages = fileList.map(f => f.response || f.url).filter(u => u && typeof u === 'string');
          if (finalImages.length === 0) {
            message.error("Cần ít nhất 1 hình ảnh!");
            setUpdateLoading(false);
            return;
          }
          // Chỉ gửi đúng các field DTO cần thiết — KHÔNG spread editingRoom
          // để tránh gửi kèm field 'amenities' dạng object [{id,name}] gây lỗi 400
          const amenityNames = (values.amenities || []).map(item =>
            typeof item === 'object' ? item.name : item
          );

          const payload = {
            title: values.title,
            propertyType: values.propertyType || editingRoom.propertyType || "ROOM",
            transactionType: values.transactionType || editingRoom.transactionType || "FOR_RENT",
            address: values.address || editingRoom.address,
            // Các field địa chỉ chi tiết (bắt buộc giống CreateRoom DTO)
            province: editingRoom.province || "Không xác định",
            district: editingRoom.district || "Không xác định",
            ward: editingRoom.ward || "Không xác định",
            street: editingRoom.street || editingRoom.address || "",
            latitude: editingRoom.latitude || 10.7769,
            longitude: editingRoom.longitude || 106.7009,
            price: values.price ? Number(values.price.toString().replace(/,/g, '')) : 0,
            area: values.area || 0,
            capacity: values.capacity || editingRoom.capacity || 1,
            bedrooms: values.bedrooms || editingRoom.bedrooms || 0,
            bathrooms: values.bathrooms || editingRoom.bathrooms || 0,
            furnishingStatus: values.furnishingStatus || editingRoom.furnishingStatus || "UNFURNISHED",
            description: values.description || editingRoom.description || "Không có mô tả",
            amenities: amenityNames,
            images: finalImages,
            videoUrl: values.videoUrl || "",
            deposit: values.deposit ? Number(values.deposit.toString().replace(/,/g, '')) : (editingRoom.deposit || 0),
            legalDocumentType: editingRoom.legalDocumentType || "NONE",
            electricityPrice: editingRoom.electricityPrice || "NEGOTIABLE",
            waterPrice: editingRoom.waterPrice || "NEGOTIABLE",
            internetPrice: editingRoom.internetPrice || "NEGOTIABLE",
            availabilityStatus: editingRoom.availabilityStatus || "IMMEDIATELY"
          };

          console.log("📤 UPDATE PAYLOAD gửi lên Backend:", payload);

          await roomService.updateRoom(editingRoom.id, payload);
          message.success("Cập nhật thành công!");
          setIsModalOpen(false);
          fetchMyRooms();
        } catch (error) {
          const responseData = error.response?.data;
          console.error("❌ CHI TIẾT LỖI TỪ BACKEND:", responseData);
          console.error("❌ STATUS:", error.response?.status);
          console.error("❌ HEADERS:", error.response?.headers);
          // Hiển thị message chi tiết nhất có thể
          const backendMsg = responseData?.message
            || responseData?.error
            || (typeof responseData === 'string' ? responseData : JSON.stringify(responseData))
            || "Cập nhật thất bại";
          message.error(`Lỗi ${error.response?.status || ''}: ${backendMsg}`);
        } finally { setUpdateLoading(false); }
      };

      const isLocationOrTypeChanged =
        (values.address !== editingRoom.address) ||
        (values.propertyType !== editingRoom.propertyType) ||
        (values.transactionType !== editingRoom.transactionType);

      if (isLocationOrTypeChanged) {
        if (editingRoom.isPromoted || editingRoom.priorityLevel > 0) {
          modal.confirm({
            title: "⚠️ CẢNH BÁO ĐỎ: Tin Đang Chạy Gói VIP",
            content: (
              <div className="space-y-2">
                <p className="text-red-600 font-semibold">Bài đăng này của bạn đang hoạt động dưới gói đẩy tin VIP!</p>
                <p className="text-gray-600">
                  Việc thay đổi các trường thông tin quan trọng như <b>Vị trí/Địa chỉ, Loại hình BĐS, hoặc Loại giao dịch</b> sẽ kích hoạt cơ chế kiểm duyệt tự động. Tin đăng sẽ bị đưa về trạng thái <b>CHỜ DUYỆT</b> và gói đẩy tin VIP sẽ bị <b>TẠM NGƯNG</b> cho đến khi Ban Quản Trị duyệt lại.
                </p>
                <p className="text-gray-500 font-medium italic mt-2 text-xs">
                  * Khuyên dùng: Nếu chỉ sai sót nhỏ, bạn hãy giữ nguyên để tránh bài đăng bị tạm ẩn chờ duyệt.
                </p>
              </div>
            ),
            okText: "Xác nhận & Lưu",
            cancelText: "Hủy",
            okButtonProps: { danger: true, className: "bg-red-600 border-red-600" },
            centered: true,
            onOk: doSubmit
          });
          return;
        } else {
          modal.confirm({
            title: "⚠️ Cảnh Báo Kiểm Duyệt Tin Đăng",
            content: (
              <div>
                <p className="text-amber-600 font-medium">Bạn vừa thay đổi thông tin nhạy cảm (Vị trí/Loại hình BĐS/Loại giao dịch).</p>
                <p className="text-gray-600 mt-2">
                  Thay đổi các trường này sẽ khiến bài đăng của bạn phải chờ Ban Quản Trị duyệt lại trước khi tiếp tục hiển thị trên sàn giao dịch. Bạn có chắc chắn muốn thực hiện?
                </p>
              </div>
            ),
            okText: "Vẫn Lưu",
            cancelText: "Hủy",
            okButtonProps: { danger: true, className: "bg-amber-600 border-amber-600" },
            centered: true,
            onOk: doSubmit
          });
          return;
        }
      }

      await doSubmit();
    } catch (error) {
      // Bỏ qua lỗi validate form
    }
  };

  const handleDelete = async (id) => {
    try {
      await roomService.deleteRoom(id);
      message.success("Đã đưa phòng vào thùng rác!");
      fetchMyRooms();
    } catch (error) { message.error("Xóa thất bại"); }
  };

  const handleRestore = async (id) => {
    try {
      await roomService.restoreRoom(id);
      message.success("Đã khôi phục phòng thành công!");
      fetchMyTrash();
    } catch (error) { message.error("Khôi phục thất bại"); }
  };

  const handleHardDelete = async (id) => {
    try {
      await roomService.hardDeleteRoom(id);
      message.success("Đã xóa vĩnh viễn!");
      fetchMyTrash();
    } catch (error) { message.error("Xóa vĩnh viễn thất bại"); }
  };

  // --- RENDERS ---
  const amenityOptions = useMemo(() => amenitiesList.map(i => ({ label: i.name, value: i.name })), [amenitiesList]);

  const renderStatus = (status) => {
    switch (status) {
      case 'ACTIVE': return <Tag color="success" icon={<CheckCircleOutlined />}>Đang hiển thị</Tag>;
      case 'HIDDEN': return <Tag color="default" icon={<EyeInvisibleOutlined />}>Đang ẩn</Tag>;
      case 'PENDING': return <Tag color="warning" icon={<ClockCircleOutlined />}>Chờ duyệt</Tag>;
      case 'REJECTED': return <Tag color="error" icon={<ExclamationCircleOutlined />}>Bị từ chối</Tag>;
      case 'EXPIRED': return <Tag color="error" icon={<StopOutlined />}>Hết hạn</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const filteredData = useMemo(() => {
    if (filterStatus === 'ALL') return rooms;
    return rooms.filter(r => r.status === filterStatus);
  }, [rooms, filterStatus]);

  // === CẤU HÌNH CỘT BẢNG ===
  const columns = [
    {
      title: 'Tin đăng',
      width: 280,
      render: (_, r) => (
        <div className="flex gap-3">
          <div className="flex-shrink-0 relative w-20 h-20 group">
            <Image src={r.images?.[0]} width={80} height={80} className="object-cover rounded-md border" />
            {(r.priorityLevel > 0) && <div className="absolute top-0 left-0 bg-[#f96302] text-white text-[10px] px-1 font-bold rounded-tl-md">VIP</div>}
          </div>
          <div className="flex flex-col justify-between py-1">
            <div>
              <Tooltip title={r.title}>
                <div className={`font-bold line-clamp-2 cursor-pointer hover:text-[#f96302] ${r.priorityLevel > 0 ? 'text-[#f96302]' : 'text-blue-900'}`} onClick={() => navigate(`/rooms/${r.id}`)}>{r.title}</div>
              </Tooltip>
              <div className="text-xs text-gray-500">#{r.id} | {r.address}</div>
            </div>
            <div>{renderStatus(r.status)}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Giá & Hạn',
      width: 160,
      render: (_, r) => {
        const isExpired = r.status === 'EXPIRED' || (r.expiresAt && dayjs().isAfter(dayjs(r.expiresAt)));
        return (
          <div className="text-xs">
            <div className="text-[#f96302] font-bold text-sm">{r.price?.toLocaleString()} đ</div>
            <div className="text-gray-400 mb-1">Cọc: {r.deposit?.toLocaleString()} đ</div>
            <div className="border-t pt-1 mt-1">
              <div className={isExpired ? "text-red-500 font-bold" : "text-green-600"}>
                HH: {r.expiresAt ? dayjs(r.expiresAt).format('DD/MM/YYYY') : '--'}
              </div>
            </div>
            {r.isPromoted && (
              <div className="mt-1 text-[10px] font-bold text-[#f96302] border border-[#f96302] rounded px-1 inline-block">
                Gói: {r.promotionPackageName || 'VIP'}
              </div>
            )}
          </div>
        )
      }
    },
    // 🟢 CỘT MỚI: TỰ ĐỘNG GIA HẠN
    {
      title: 'Tự động',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <div className="flex flex-col items-center">
          <Switch
            size="small"
            checked={r.autoRenew}
            onChange={(checked) => handleAutoRenewChange(checked, r)}
            disabled={r.status === 'PENDING' || r.status === 'REJECTED' || r.status === 'EXPIRED'}
          />
          <span className="text-[10px] text-gray-400 mt-1">{r.autoRenew ? 'Bật' : 'Tắt'}</span>
        </div>
      )
    },
    {
      title: 'Tác vụ',
      key: 'action',
      width: 130,
      fixed: 'right',
      render: (_, r) => (
        <div className="flex flex-col gap-2">
          <Tooltip title={!canPushRoom(r) ? getPushDisabledReason(r) : 'Đẩy tin VIP'}>
            <span>
              <Button
                size="small"
                disabled={!canPushRoom(r)}
                className={
                  canPushRoom(r)
                    ? "bg-orange-50 text-[#f96302] border-[#f96302] hover:bg-[#f96302] hover:text-white font-bold"
                    : "bg-gray-100 text-gray-400 border-gray-200 font-bold cursor-not-allowed"
                }
                onClick={() => handleOpenPushModal(r)}
                icon={<RocketOutlined />}
              >
                Đẩy tin
              </Button>
            </span>
          </Tooltip>

          <div className="flex gap-2 justify-center">
            {r.status === 'EXPIRED' ? (
              <Tooltip title="Tin đã hết hạn, không thể đẩy tin. Vui lòng đăng/gia hạn lại tin trước.">
                <span>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    disabled
                    className="text-gray-400 border-gray-200"
                  />
                </span>
              </Tooltip>
            ) : (
              <Tooltip title={r.status === 'HIDDEN' ? "Đăng lại tin" : "Ẩn tin tạm thời"}>
                <Button
                  size="small"
                  icon={r.status === 'HIDDEN' ? <ReloadOutlined /> : <EyeInvisibleOutlined />}
                  onClick={() => handleStatusToggle(r)}
                  className={r.status === 'HIDDEN' ? "text-green-600 border-green-600" : "text-gray-500 border-gray-300"}
                />
              </Tooltip>
            )}

            <Tooltip title="Sửa tin">
              <Button type="primary" ghost size="small" icon={<EditOutlined />} onClick={() => handleEditClick(r)} />
            </Tooltip>

            <Tooltip title="Xóa tin">
              <Popconfirm
                title="Chắc chắn xóa?"
                onConfirm={() => handleDelete(r.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ className: "bg-red-500 text-white border-none hover:!bg-red-600 hover:!text-white" }}
              >
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          </div>
        </div>
      )
    }
  ];

  // === CỘT THÙNG RÁC ===
  const trashColumns = [
    {
      title: 'Tin đăng (Đã xóa)',
      width: 280,
      render: (_, r) => (
        <div className="flex gap-3">
          <div className="flex-shrink-0 relative w-20 h-20 group">
            <Image src={r.images?.[0]} width={80} height={80} className="object-cover rounded-md border opacity-50" />
          </div>
          <div className="flex flex-col py-1">
            <div className="font-bold line-through text-gray-400">{r.title}</div>
            <div className="text-xs text-gray-400">#{r.id} | {r.address}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 150,
      render: (_, r) => (
        <Space>
          <Popconfirm title="Khôi phục tin này?" onConfirm={() => handleRestore(r.id)} okText="Khôi phục" cancelText="Hủy">
            <Button type="primary" className="bg-green-600" size="small" icon={<UndoOutlined />}>Khôi phục</Button>
          </Popconfirm>
          <Popconfirm title="Xóa vĩnh viễn tin này?" description="Không thể hoàn tác!" onConfirm={() => handleHardDelete(r.id)} okText="Xóa luôn" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button danger size="small" icon={<DeleteOutlined />}>Xóa vĩnh viễn</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div><Title level={3} style={{ margin: 0 }}>Quản Lý Tin Đăng</Title><Text type="secondary">Danh sách phòng và trạng thái hiển thị</Text></div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/landlord/create-room')} className="bg-[#f96302]">Đăng Tin Mới</Button>
      </div>

      <Tabs defaultActiveKey="ALL" items={[
        { key: 'ALL', label: `Tất cả (${rooms.length})` },
        { key: 'ACTIVE', label: 'Đang hiển thị' },
        { key: 'HIDDEN', label: 'Đã ẩn' },
        { key: 'PENDING', label: 'Chờ duyệt' },
        { key: 'REJECTED', label: 'Bị từ chối' },
        { key: 'EXPIRED', label: 'Hết hạn' },
        { key: 'TRASH', label: <span className="text-red-500"><DeleteOutlined /> Thùng rác</span> }
      ]} onChange={setFilterStatus} className="mb-4 custom-tabs" />

      {filterStatus === 'TRASH' ? (
        <Table columns={trashColumns} dataSource={trashRooms} rowKey="id" loading={loading} pagination={{ pageSize: 8 }} scroll={{ x: 800 }} className="border rounded-lg" />
      ) : (
        <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} pagination={{ pageSize: 8 }} scroll={{ x: 1000 }} className="border rounded-lg" />
      )}

      {/* --- MODAL ĐẨY TIN --- */}
      <Modal
        title={<div className="flex items-center gap-2 text-[#f96302] text-xl"><FireFilled /> Đẩy Tin Lên Top</div>}
        open={isPushModalOpen}
        onCancel={() => setIsPushModalOpen(false)}
        footer={[<Button key="back" onClick={() => setIsPushModalOpen(false)}>Hủy</Button>, <Button key="submit" type="primary" className="bg-[#f96302]" onClick={handlePushPayment} loading={pushLoading}>Thanh Toán</Button>]}
        width={700} centered
      >
        <div className="mb-4 bg-orange-50 p-3 rounded text-gray-600">Đẩy tin cho: <b>{selectedRoomToPush?.title}</b></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
          {pushPackages.map(pkg => (
            <div key={pkg.id} onClick={() => setSelectedPackageId(pkg.id)}
              className={`cursor-pointer border-2 rounded-xl p-4 ${selectedPackageId === pkg.id ? 'border-[#f96302] bg-orange-50' : 'border-gray-200'}`}>
              <div className="flex justify-between"><h4 className="font-bold">{pkg.name}</h4>{selectedPackageId === pkg.id && <CheckCircleFilled className="text-[#f96302]" />}</div>
              <div className="text-xl font-bold my-1">{pkg.price?.toLocaleString()} đ</div>
              <div className="text-sm text-gray-500">Hiệu lực: {pkg.durationDays} ngày</div>
            </div>
          ))}
        </div>
      </Modal>

      {/* --- MODAL CẬP NHẬT --- */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={900}
        title="Cập nhật tin"
        centered
        footer={[
          <Popconfirm
            key="delete"
            title="Bạn có chắc chắn muốn xóa bài viết này không?"
            onConfirm={() => {
              handleDelete(editingRoom?.id);
              setIsModalOpen(false);
            }}
            okButtonProps={{ danger: true }}
            okText="Xóa"
            cancelText="Không"
          >
          </Popconfirm>,
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            Hủy
          </Button>,
          <Button key="save" type="primary" className="bg-[#f96302]" loading={updateLoading} onClick={handleUpdateSubmit}>
            Lưu dữ liệu
          </Button>
        ]}
      >
        <Form form={form} layout="vertical">
          <Tabs defaultActiveKey="1" items={[
            {
              key: '1', label: 'Thông tin chính', children: (
                <>
                  <Form.Item label="Tiêu đề" name="title" rules={[{ required: true }]}><Input /></Form.Item>
                  <Row gutter={16}>
                    <Col span={6}><Form.Item label="Loại BĐS" name="propertyType"><Select><Option value="ROOM">Phòng trọ</Option><Option value="HOUSE">Nhà nguyên căn</Option><Option value="APARTMENT">Chung cư</Option></Select></Form.Item></Col>
                    <Col span={6}><Form.Item label="Giá (₫)" name="price"><InputNumber className="w-full" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v.replace(/,/g, ''))} /></Form.Item></Col>

                    <Col span={6}><Form.Item label="Diện tích (m²)" name="area"><InputNumber className="w-full" /></Form.Item></Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={8}><Form.Item label="Sức chứa" name="capacity"><InputNumber className="w-full" /></Form.Item></Col>
                    <Col span={8}><Form.Item label="Phòng ngủ" name="bedrooms"><InputNumber className="w-full" /></Form.Item></Col>
                    <Col span={8}><Form.Item label="Phòng tắm" name="bathrooms"><InputNumber className="w-full" /></Form.Item></Col>
                  </Row>
                  <Form.Item label="Địa chỉ cụ thể" name="address"><Input /></Form.Item>
                  <Form.Item label="Mô tả chi tiết" name="description"><TextArea rows={4} /></Form.Item>
                  <Form.Item label="Tiện ích" name="amenities">
                    <Select mode="multiple" placeholder="Chọn tiện ích" options={amenityOptions} />
                  </Form.Item>
                </>
              )
            },
            {
              key: '3', label: 'Media', children: (
                <>
                  <Form.Item label="Video URL" tooltip="Dán link hoặc upload">
                    <Space.Compact className="w-full">
                      <Form.Item name="videoUrl" noStyle>
                        <Input prefix={<VideoCameraOutlined />} placeholder="URL video sau khi upload..." />
                      </Form.Item>
                      <Upload accept="video/*" showUploadList={false} customRequest={handleUploadVideo}>
                        <Button icon={<UploadOutlined />} loading={videoLoading}>Upload</Button>
                      </Upload>
                    </Space.Compact>
                  </Form.Item>
                  {currentVideoUrl && (
                    <div className="mb-4 text-center bg-gray-50 rounded-lg p-2 border border-gray-200">
                      <p className="text-gray-500 text-xs mb-1">Bản xem trước video</p>
                      <video src={currentVideoUrl} controls className="max-w-full rounded mx-auto" style={{ maxHeight: '200px' }} />
                    </div>
                  )}
                  <Form.Item label="Hình ảnh"><Upload listType="picture-card" customRequest={handleUploadImage} fileList={fileList} onChange={({ fileList }) => setFileList(fileList)} maxCount={5}>{fileList.length < 5 && <div><UploadOutlined /><div>Thêm</div></div>}</Upload></Form.Item>
                </>
              )
            }
          ]} />
        </Form>
      </Modal>
    </div>
  );
};

export default MyRooms;
