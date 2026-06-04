import React, { useEffect, useState } from 'react';
import {
  Form, Input, Button, message, Upload, Tabs, Avatar, Collapse, Typography, Modal
} from 'antd';
import {
  UserOutlined, CameraOutlined, LockOutlined, RightOutlined, MailOutlined
} from '@ant-design/icons';
import userService from '../../services/userService';
import authService from '../../services/authService';
import uploadService from '../../services/uploadService';
import useAuth from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ImgCrop from 'antd-img-crop';
import favoriteService from '../../services/favoriteService';
import { HeartFilled, BookFilled, EnvironmentOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const UserProfile = () => {
  const { user, refreshProfile } = useAuth();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [forgotPasswordForm] = Form.useForm();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // States for Liked & Saved Properties
  const [likedProperties, setLikedProperties] = useState([]);
  const [savedProperties, setSavedProperties] = useState([]);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // 🟢 HÀM LOG DỮ LIỆU ĐỂ KIỂM TRA
  useEffect(() => {
    console.log("=== DỮ LIỆU USER TỪ BÊN TRONG PROFILE ===", user);
  }, [user]);

  // Load dữ liệu khi vào trang
  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatarUrl);
      setBannerUrl(user.bannerUrl);
      // Xóa trắng dữ liệu cũ bị kẹt
      form.resetFields();
      // Đổ dữ liệu mới
      form.setFieldsValue({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        citizenId: user.citizenId
      });
      fetchInteractions();
    }
  }, [user, form]);

  const fetchInteractions = async () => {
    try {
      setLoadingLiked(true);
      const resLiked = await favoriteService.getMyLikedProperties(0, 50);
      const likedData = resLiked.data?.result?.content || resLiked.data?.content || resLiked.data || [];
      setLikedProperties(Array.isArray(likedData) ? likedData : []);
    } catch (e) {
      console.error("Lỗi lấy danh sách đã thích:", e);
    } finally {
      setLoadingLiked(false);
    }

    try {
      setLoadingSaved(true);
      const resSaved = await favoriteService.getMySavedProperties(0, 50);
      const savedData = resSaved.data?.result?.content || resSaved.data?.content || resSaved.data || [];
      setSavedProperties(Array.isArray(savedData) ? savedData : []);
    } catch (e) {
      console.error("Lỗi lấy danh sách đã lưu:", e);
    } finally {
      setLoadingSaved(false);
    }
  };

  // --- XỬ LÝ UPLOAD ẢNH ĐẠI DIỆN ---
  const handleUploadAvatar = async ({ file, onSuccess, onError }) => {
    try {
      const result = await uploadService.uploadImage(file);
      
      // Trích xuất URL chuẩn xác từ response
      let newUrl = result;
      if (typeof result === 'object' && result !== null) {
        if (typeof result.result === 'string') {
          newUrl = result.result;
        } else {
          newUrl = result.url || result.result?.url || result.data?.url || '';
        }
      }

      // Nếu không lấy được URL từ Backend thì dùng URL tạm của trình duyệt để hiển thị
      const finalUrl = newUrl ? `${newUrl}?t=${Date.now()}` : URL.createObjectURL(file);
      setAvatarUrl(finalUrl);

      // SỬA LỖI 500: Gửi kèm đầy đủ các trường cũ để Backend không báo lỗi thiếu thông tin
      const updateData = {
        fullName: form.getFieldValue('fullName') || user.fullName,
        phone: form.getFieldValue('phone') || user.phone,
        citizenId: form.getFieldValue('citizenId') || user.citizenId,
        avatarUrl: newUrl // Gửi URL thực tế lên Backend
      };

      await userService.updateProfile(updateData);

      refreshProfile();
      message.success("Cập nhật ảnh đại diện thành công!");
      onSuccess("Ok");
    } catch (error) {
      console.error("Avatar Upload Error:", error);
      message.error("Lỗi cập nhật ảnh đại diện.");
      onError(error);
    }
  };

  // --- XỬ LÝ UPLOAD BANNER ---
  const handleUploadBanner = async ({ file, onSuccess, onError }) => {
    try {
      const result = await userService.uploadBanner(file);
      let newUrl = result.data?.url || result.data?.result?.bannerUrl || result.data?.result || URL.createObjectURL(file);
      setBannerUrl(newUrl);

      // Nếu Backend cần updateProfile luôn:
      // const updateData = {
      //   fullName: form.getFieldValue('fullName') || user.fullName,
      //   phone: form.getFieldValue('phone') || user.phone,
      //   citizenId: form.getFieldValue('citizenId') || user.citizenId,
      //   bannerUrl: newUrl
      // };
      // await userService.updateProfile(updateData);

      message.success("Cập nhật ảnh bìa thành công!");
      refreshProfile();
      onSuccess("Ok");
    } catch (error) {
      console.error("Banner Upload Error:", error);
      message.error("Lỗi upload ảnh bìa.");
      onError(error);
    }
  };

  // --- XỬ LÝ ĐỔI EMAIL ---
  const handleChangeEmail = async (values) => {
    setLoading(true);
    try {
      await authService.changeEmail(values.password, values.newEmail);
      message.success("Đổi email thành công! Thông tin đã được cập nhật.");
      setIsEmailModalOpen(false);
      refreshProfile(); 
    } catch (error) {
      message.error("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // --- XỬ LÝ CẬP NHẬT THÔNG TIN ---
  const handleUpdateInfo = async (values) => {
    setLoading(true);
    try {
      await userService.updateProfile(values);
      message.success("Cập nhật thông tin thành công!");
      refreshProfile();
    } catch (error) {
      message.error("Lỗi cập nhật: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // --- XỬ LÝ ĐỔI MẬT KHẨU ---
  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      await authService.changePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      message.success("Đổi mật khẩu thành công!");
      passwordForm.resetFields();
    } catch (error) {
      message.error("Đổi mật khẩu thất bại: " + (error.response?.data?.message || "Mật khẩu hiện tại không đúng"));
    } finally {
      setLoading(false);
    }
  };

  // --- XỬ LÝ GỬI EMAIL QUÊN MẬT KHẨU ---
  const handleForgotPassword = async (values) => {
    setForgotLoading(true);
    try {
      await authService.forgotPassword(values.email);
      message.success("Liên kết đặt lại mật khẩu đã được gửi đến email của bạn!");
      setIsForgotModalOpen(false);
      forgotPasswordForm.resetFields();
    } catch (error) {
      message.error("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setForgotLoading(false);
    }
  };

  // 🟢 LÀM MỚI QUYỀN (SAU KHI KYC ĐƯỢC DUYỆT)
  const handleRefreshRole = async () => {
    try {
      setLoading(true);
      const userSessionId = sessionStorage.getItem('userSessionId');
      let oldToken = sessionStorage.getItem(`${userSessionId}_accessToken`);
      
      if (!oldToken) throw new Error("Không tìm thấy token hiện tại");

      const res = await authService.refreshToken(oldToken);
      const newToken = res.data.result.token;
      
      // Cập nhật token và role mới
      sessionStorage.setItem(`${userSessionId}_accessToken`, newToken);
      sessionStorage.setItem(`${userSessionId}_role`, res.data.result.role);
      
      await refreshProfile();
      message.success("Làm mới quyền thành công! Bạn đã cập nhật vai trò mới.");
      window.location.reload();
    } catch (error) {
      message.error("Lỗi làm mới quyền: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 🟢 ĐÃ SỬA ANTI-PATTERN: Đổi từ Component con thành biến chứa JSX
  const editInfoTabContent = (
    <Form form={form} layout="vertical" onFinish={handleUpdateInfo} className="max-w-3xl">
      {/* 🟢 ALERT NHẮC NHỞ LÀM MỚI QUYỀN */}
      {user?.kycStatus === 'VERIFIED' && user?.role === 'USER' && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
          <div>
            <h4 className="text-orange-800 font-bold mb-1">Tài khoản đã được xác minh KYC!</h4>
            <p className="text-orange-700 text-sm m-0">
              Vui lòng làm mới quyền để hệ thống cập nhật vai trò Chủ trọ (Landlord) cho bạn.
            </p>
          </div>
          <Button 
            type="primary" 
            className="bg-orange-500 hover:bg-orange-600 border-none font-bold"
            onClick={handleRefreshRole}
            loading={loading}
          >
            Làm Mới Quyền Ngay
          </Button>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 border-b pb-2">Thông tin cá nhân</h3>
        <div className="relative mb-16">
          {/* Khung chứa Banner có overflow-hidden để bo góc, chiều rộng 100% */}
          <div className="rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-200 w-full">
            <Upload 
              showUploadList={false} 
              customRequest={handleUploadBanner} 
              className="w-full block" 
              rootClassName="w-full block"
              style={{ width: '100%', display: 'block' }}
            >
              <div className="h-48 w-full group cursor-pointer relative block" style={{ width: '100%' }}>
                <img src={bannerUrl || "https://placehold.co/1200x300?text=Chưa+có+ảnh+bìa"} className="w-full h-full object-cover block" style={{ width: '100%' }} />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-medium"><CameraOutlined className="mr-2"/> Cập nhật ảnh bìa</span>
                </div>
              </div>
            </Upload>
          </div>

          {/* Vùng chứa Avatar nằm đè lên, không bị cắt xén vì relative cha không có overflow-hidden */}
          <div className="absolute -bottom-10 left-8 z-10">
            <ImgCrop 
              rotationSlider 
              aspect={1} 
              shape="round" 
              modalTitle="Cắt ảnh đại diện" 
              modalOk="Xác nhận" 
              modalCancel="Hủy"
              modalProps={{
                okButtonProps: { 
                  style: { backgroundColor: '#f97316', borderColor: '#f97316', color: '#fff' } 
                }
              }}
            >
              <Upload showUploadList={false} customRequest={handleUploadAvatar}>
                <div className="relative group cursor-pointer">
                  {/* Dùng ảnh avatar mặc định mà user vừa gửi */}
                  <Avatar size={100} src={avatarUrl || "/default-avatar.png"} className="border-4 border-white shadow-md bg-white object-cover" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-white text-center">
                      <CameraOutlined className="text-xl block" />
                    </div>
                  </div>
                </div>
              </Upload>
            </ImgCrop>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
            <Input size="large" className="rounded-md" />
          </Form.Item>
          <Form.Item label="Mã số thuế cá nhân (CCCD)" name="citizenId">
            <Input size="large" className="rounded-md" placeholder="Nhập mã số thuế hoặc CCCD" />
          </Form.Item>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 border-b pb-2">Thông tin liên hệ</h3>
        <Form.Item label="Số điện thoại chính" name="phone" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
          <Input size="large" />
        </Form.Item>
        <Form.Item label="Email" className="mb-2">
          <div className="flex gap-2">
            <Input size="large" value={user?.email} disabled className="bg-gray-100 text-gray-500 flex-1" />
            <Button size="large" onClick={() => setIsEmailModalOpen(true)}>Đổi Email</Button>
          </div>
        </Form.Item>
      </div>

      <div className="flex justify-end mt-4">
        <Button type="primary" htmlType="submit" size="large" loading={loading} className="bg-[#d32f2f] hover:bg-[#b71c1c] border-none font-medium px-8 h-10 rounded shadow-sm">
          Lưu thay đổi
        </Button>
      </div>
    </Form>
  );

  const accountSettingsTabContent = (
    <div className="max-w-3xl">
      <div className="mb-10">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Đổi mật khẩu</h3>
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item label="Mật khẩu hiện tại" name="currentPassword" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}>
            <Input.Password size="large" placeholder="********" />
          </Form.Item>

          <div className="flex justify-end -mt-6 mb-4">
            <Button type="link" onClick={() => setIsForgotModalOpen(true)} className="text-red-500 text-sm hover:underline p-0">
              Bạn quên mật khẩu?
            </Button>
          </div>

          <Form.Item label="Mật khẩu mới" name="newPassword" rules={[{ required: true, message: 'Nhập mật khẩu mới' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
            <Input.Password size="large" />
          </Form.Item>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Form.Item label="Nhập lại mật khẩu mới" name="confirmPassword" dependencies={['newPassword']} rules={[{ required: true, message: 'Xác nhận mật khẩu' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newPassword') === value) return Promise.resolve(); return Promise.reject(new Error('Mật khẩu không khớp!')); }, }),]}>
                <Input.Password size="large" />
              </Form.Item>
            </div>
            <div className="mb-6">
              <Button type="primary" htmlType="submit" loading={loading} className="bg-[#d32f2f] hover:bg-[#b71c1c] border-none h-10 px-6 font-medium">
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </Form>
      </div>

      <div className="border-t pt-4">
        <Collapse ghost expandIconPosition="end" expandIcon={({ isActive }) => <RightOutlined rotate={isActive ? 90 : 0} />}>
          <Panel header={<span className="font-semibold text-gray-800 text-base">Yêu cầu khóa tài khoản</span>} key="1">
            <div className="pl-4 pb-2">
              <p className="text-gray-600 mb-2">Tạm thời vô hiệu hóa tài khoản của bạn. Các tin đăng sẽ bị ẩn.</p>
              <Button danger>Khóa tài khoản</Button>
            </div>
          </Panel>
          <Panel header={<span className="font-semibold text-gray-800 text-base">Yêu cầu xóa tài khoản</span>} key="2">
            <div className="pl-4 pb-2">
              <p className="text-gray-600 mb-2 text-sm">Hành động này không thể hoàn tác. Mọi dữ liệu sẽ bị xóa vĩnh viễn.</p>
              <Button type="primary" danger>Xóa vĩnh viễn</Button>
            </div>
          </Panel>
        </Collapse>
      </div>
    </div>
  );

  const renderPropertyCard = (property) => (
    <div 
      key={property.id} 
      className="flex bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden cursor-pointer mb-4"
      onClick={() => navigate(`/rooms/${property.id}`)}
    >
      <div className="w-1/3 h-32 bg-gray-200 shrink-0">
        <img 
          src={property.imageUrl || "https://via.placeholder.com/300x200?text=No+Image"} 
          alt={property.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-gray-800 text-base line-clamp-1 mb-1">{property.title}</h4>
          <p className="text-[#ea580c] font-bold text-lg mb-1">{property.price?.toLocaleString()} VNĐ</p>
          <p className="text-gray-500 text-xs flex items-center line-clamp-1">
            <EnvironmentOutlined className="mr-1" /> {property.address}
          </p>
        </div>
        <div className="flex gap-2 mt-2">
          {property.liked && <span className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded border border-red-100 flex items-center gap-1"><HeartFilled /> Đã thích</span>}
          {property.saved && <span className="text-xs bg-blue-50 text-blue-500 px-2 py-1 rounded border border-blue-100 flex items-center gap-1"><BookFilled /> Đã lưu</span>}
        </div>
      </div>
    </div>
  );

  const likedTabContent = (
    <div className="max-w-4xl">
      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <HeartFilled className="text-red-500" /> Bất động sản bạn đã thích ({likedProperties.length})
      </h3>
      {loadingLiked ? <p className="text-gray-500">Đang tải dữ liệu...</p> : 
        likedProperties.length === 0 ? <p className="text-gray-500 italic">Bạn chưa thích bất động sản nào.</p> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {likedProperties.map(renderPropertyCard)}
        </div>
      }
    </div>
  );

  const savedTabContent = (
    <div className="max-w-4xl">
      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <BookFilled className="text-blue-500" /> Bất động sản bạn đã lưu ({savedProperties.length})
      </h3>
      {loadingSaved ? <p className="text-gray-500">Đang tải dữ liệu...</p> : 
        savedProperties.length === 0 ? <p className="text-gray-500 italic">Bạn chưa lưu bất động sản nào.</p> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedProperties.map(renderPropertyCard)}
        </div>
      }
    </div>
  );

  return (
    <div className="bg-white min-h-screen p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý tài khoản</h1>
        <Tabs
          defaultActiveKey="1"
          items={[
            { key: '1', label: 'Chỉnh sửa thông tin', children: editInfoTabContent },
            { key: '2', label: 'Cài đặt tài khoản', children: accountSettingsTabContent },
            { key: '3', label: <span className="flex items-center gap-1"><HeartFilled className="text-red-500"/> Tin đã thích</span>, children: likedTabContent },
            { key: '4', label: <span className="flex items-center gap-1"><BookFilled className="text-blue-500"/> Tin đã lưu</span>, children: savedTabContent },
            { key: '5', label: <span className="flex items-center gap-1">Đăng ký Môi giới <span className="bg-red-500 text-white text-[10px] px-1 rounded ml-1">Mới</span></span>, disabled: true }
          ]}
          size="large"
          tabBarStyle={{ borderBottom: '1px solid #f0f0f0', marginBottom: '32px', fontWeight: 500 }}
        />
      </div>

      {/* Modal Quên mật khẩu */}
      <Modal
        title="Khôi phục mật khẩu"
        open={isForgotModalOpen}
        onCancel={() => setIsForgotModalOpen(false)}
        footer={null}
        centered
      >
        <Form form={forgotPasswordForm} layout="vertical" onFinish={handleForgotPassword}>
          <p className="text-gray-500 mb-4">Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</p>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập đúng email' }]}>
            <Input prefix={<MailOutlined />} placeholder="email@example.com" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={forgotLoading} className="bg-[#d32f2f] h-10 border-none">
            Gửi yêu cầu
          </Button>
        </Form>
      </Modal>

      {/* Modal Đổi Email */}
      <Modal
        title="Đổi địa chỉ Email"
        open={isEmailModalOpen}
        onCancel={() => setIsEmailModalOpen(false)}
        footer={null}
        centered
      >
        <Form layout="vertical" onFinish={handleChangeEmail}>
          <Form.Item name="password" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Cần nhập mật khẩu' }]}>
            <Input.Password size="large" placeholder="Nhập mật khẩu để xác thực" />
          </Form.Item>
          <Form.Item name="newEmail" label="Email mới" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
            <Input size="large" placeholder="ví_dụ@gmail.com" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading} className="bg-[#d32f2f] hover:bg-[#b71c1c] border-none">
            Xác nhận đổi Email
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default UserProfile;