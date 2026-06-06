// src/pages/landlord/CreateRoom.jsx
import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Upload, Card, Row, Col, Divider, Tag, Typography, Space, App } from 'antd';
import {
  UploadOutlined, EnvironmentOutlined, VideoCameraOutlined,
  HomeOutlined, StarFilled, CrownFilled, CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

// Import Services
import roomService from '../../services/roomService';
import useAuth from '../../hooks/useAuth';
// Import Component Bản đồ
import LocationPicker from '../../components/shared/LocationPicker';
import walletService from '../../services/walletService';

// Import data 34 tỉnh
import provinceData from '../../data/province.json';
import wardData from '../../data/ward.json';

const { Option } = Select;
const { TextArea } = Input;

const CreateRoom = () => {
  const { user, refreshProfile } = useAuth();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // State quản lý upload
  const [fileList, setFileList] = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);

  // State dữ liệu danh mục
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [wallet, setWallet] = useState(null);

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  useEffect(() => {
    // Chuyển object thành mảng cho danh sách Tỉnh
    setProvinces(Object.values(provinceData || {}));
  }, []);

  const handleProvinceChange = (val, opt) => {
    form.setFieldsValue({ province: opt.children, ward: undefined });
    const filteredWards = Object.values(wardData || {}).filter(w => w.parent_code === String(val));
    setWards(filteredWards);
  };

  const handleWardChange = (val, opt) => {
    form.setFieldsValue({ ward: opt.children });
  };

  const currentVideoUrl = Form.useWatch('videoUrl', form);

  // KIỂM TRA HỘI VIÊN CÒN HẠN
  const hasActiveMembership = user?.membershipPackage &&
    user?.membershipExpiresAt &&
    dayjs().isBefore(dayjs(user.membershipExpiresAt));

  // Load danh sách tiện ích & gói cước
  useEffect(() => {
    const fetchMasterData = async () => {
      const results = await Promise.allSettled([
        roomService.getAllAmenities(),
        roomService.getAllPackages(),
        walletService.getMyWallet(),
        roomService.getPublicProjects()
      ]);

      if (results[0].status === 'fulfilled') {
        const ameRes = results[0].value;
        const data = ameRes.data?.result || ameRes.data || [];
        setAmenitiesList(Array.isArray(data) ? data : []);
      } else {
        console.error("Lỗi tải tiện ích:", results[0].reason);
        setAmenitiesList([]);
      }

      if (results[1].status === 'fulfilled') {
        const pkgRes = results[1].value;
        const data = pkgRes.data?.result || pkgRes.data || [];
        setPackagesList(Array.isArray(data) ? data : []);
      } else {
        console.error("Lỗi tải gói cước:", results[1].reason);
        setPackagesList([]);
      }

      if (results[2].status === 'fulfilled') {
        const walletRes = results[2].value;
        setWallet(walletRes.data?.result || walletRes.data || null);
      } else {
        console.error("Lỗi tải ví:", results[2].reason);
        setWallet(null);
      }

      if (results[3].status === 'fulfilled') {
        const projRes = results[3].value;
        const projData = projRes.data?.content || projRes.data?.result?.content || projRes.data?.result || projRes.data || [];
        setProjectsList(Array.isArray(projData) ? projData : []);
      } else {
        console.error("Lỗi tải dự án:", results[3].reason);
        setProjectsList([]);
      }

      // Nếu là hội viên, tự động điền ID gói hội viên vào form
      if (hasActiveMembership) {
        form.setFieldsValue({ servicePackageId: user.membershipPackage.id });
      }
    };
    fetchMasterData();
  }, [hasActiveMembership, user, form]);

  const handleLocationChange = (lat, lng, addressData) => {
    form.setFieldsValue({ latitude: lat, longitude: lng });
    if (addressData) {
      // Chỉ điền địa chỉ, KHÔNG tự động điền Tỉnh/Phường từ Nominatim
      // Người dùng bắt buộc phải chọn Tỉnh/Phường từ danh sách 34 tỉnh
      form.setFieldsValue({
        address: addressData.fullAddress,
        street: addressData.street
      });
    }
  };

  const handleUploadImages = async ({ file, onSuccess, onError }) => {
    try {
      const res = await roomService.uploadImage(file);
      // Backend trả về ApiResponse<String> với url nằm trực tiếp trong result
      const resultData = res.data?.result || res.data?.data || res.data;
      const finalUrl = typeof resultData === 'string' ? resultData : resultData?.url;

      if (!finalUrl || typeof finalUrl !== 'string' || !finalUrl.startsWith('http')) {
        throw new Error("Không lấy được URL từ Backend");
      }
      onSuccess(finalUrl);
    } catch (err) {
      onError(err);
      message.error("Upload ảnh lỗi");
    }
  };
  const beforeUploadVideo = (file) => {
    const isLt50M = file.size / 1024 / 1024 < 50; // Giới hạn 50MB
    if (!isLt50M) {
      message.error('Video phải nhỏ hơn 50MB!');
    }
    return isLt50M || Upload.LIST_IGNORE; // Trả về false/LIST_IGNORE để huỷ upload
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

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      // 1. KIỂM TRA: Nếu user chưa có Hội viên và có chọn mua gói -> Phải mua Hội viên TRƯỚC
      if (!hasActiveMembership && values.servicePackageId && values.servicePackageId !== 'FREE') {
        try {
          message.loading({ content: "Đang xử lý thanh toán...", duration: 2 });
          await roomService.buyMembership(values.servicePackageId);
          message.success("Nâng cấp gói hội viên thành công!");

          // Cập nhật lại thông tin user để có quota mới
          if (refreshProfile) await refreshProfile();

          // 🕒 CHỜ ĐỒNG BỘ: Đợi 2 giây để Kafka đồng bộ quota sang Property Service
          message.loading({ content: "Đang đồng bộ quyền lợi mới...", key: "payment", duration: 2 });
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (payErr) {
          console.error("Lỗi thanh toán:", payErr);

          const payMsg = payErr.response?.data?.error || payErr.response?.data?.message || "Số dư không đủ hoặc lỗi hệ thống";
          modal.error({
            title: 'Thanh toán thất bại',
            content: `Chi tiết lỗi: ${payMsg}. Vui lòng kiểm tra lại số dư hoặc thử lại sau.`
          });
          setLoading(false);
          return;
        }
      }

      const imageUrls = fileList
        .filter(f => f.status === 'done')
        .map(f => f.response || f.url);

      if (imageUrls.length === 0) {
        message.error("Vui lòng tải lên ít nhất 1 hình ảnh!");
        setLoading(false);
        return;
      }

      if (!values.latitude || !values.longitude) {
        message.error("Vui lòng chọn vị trí trên bản đồ!");
        setLoading(false);
        return;
      }
      if (!values.province || !values.ward) {
        message.error("Vui lòng chọn Tỉnh/Thành phố và Phường/Xã!");
        setLoading(false);
        return;
      }

      if (!values.district && !values.ward && !values.province) {
        message.error("Thiếu thông tin khu vực. Vui lòng chọn lại vị trí!");
        setLoading(false);
        return;
      }

      const payload = {
        projectId: values.projectId || null,

        title: values.title?.trim(),
        description: values.description || "Không có mô tả",

        propertyType: values.propertyType || "ROOM",
        transactionType: values.transactionType || "FOR_RENT",

        address: values.address?.trim(),
        province: values.province,
        district: values.district || values.ward || values.province,
        ward: values.ward,
        street: values.street || values.address,

        latitude: Number(values.latitude),
        longitude: Number(values.longitude),

        amenities: values.amenities || [],
        images: imageUrls,
        videoUrl: values.videoUrl || null,

        price: values.price ? Number(values.price.toString().replace(/,/g, '')) : 0,
        area: values.area ? Number(values.area) : 0,
        capacity: values.capacity ?? null,

        bedrooms: values.bedrooms ?? 0,
        bathrooms: values.bathrooms ?? 0,
        hasBalcony: values.hasBalcony ?? false,

        furnishingStatus: values.furnishingStatus || "UNFURNISHED",
        availabilityStatus: values.availabilityStatus || "IMMEDIATELY",

        electricityPrice: values.electricityPrice || "NEGOTIABLE",
        waterPrice: values.waterPrice || "NEGOTIABLE",
        internetPrice: values.internetPrice || "NEGOTIABLE",

        legalDocumentType: values.legalDocumentType || "NONE",
        validityDays: values.validityDays || 30
      };

      // GỌI API tạo phòng (Lúc này đã có quota nếu vừa mua xong)
      await roomService.createRoom(payload);

      message.success("Đăng tin thành công! Tin của bạn đang chờ phê duyệt.");
      navigate('/landlord/room-list');

    } catch (error) {
      console.error("LỖI TỪ BACKEND:", error);
      let errorMsg = "Xử lý thất bại";
      if (error.response?.data) {
        errorMsg = error.response.data.message || (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data) || "Lỗi từ máy chủ";
      } else if (error.message) {
        errorMsg = `Lỗi kết nối hoặc hệ thống: ${error.message}`;
      }

      modal.error({
        title: 'Hệ thống từ chối yêu cầu',
        content: (
          <div>
            <p>Có lỗi xảy ra trong quá trình xử lý:</p>
            <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-40">{errorMsg}</pre>
          </div>
        ),
        width: 600
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-[#f8f9fa]">
      <Card
        title={<span className="text-lg font-bold text-blue-700"><HomeOutlined /> ĐĂNG TIN PHÒNG TRỌ MỚI</span>}
        className="shadow-xl rounded-xl border-t-4 border-blue-600"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            propertyType: 'ROOM',
            transactionType: 'FOR_RENT',
            furnishingStatus: 'UNFURNISHED',
            availabilityStatus: 'IMMEDIATELY',
            legalDocumentType: 'NONE',
            electricityPrice: 'NEGOTIABLE',
            waterPrice: 'NEGOTIABLE',
            internetPrice: 'NEGOTIABLE',
            hasBalcony: false,
            validityDays: 30,
            latitude: 10.7769,
            longitude: 106.7009
          }}
        >
          <Divider titlePlacement="left" className="text-blue-600 border-blue-200">1. Thông tin cơ bản</Divider>

          {/* 
          <Form.Item name="projectId" label="Thuộc Dự án / Khu trọ (Tùy chọn)" tooltip="Chọn dự án để tự động điền địa chỉ và tọa độ">
            <Select
              showSearch
              allowClear
              size="large"
              placeholder="Gõ để tìm kiếm dự án..."
              optionFilterProp="children"
              onChange={(val) => {
                const proj = projectsList.find(p => p.id === val);
                if (proj) {
                  form.setFieldsValue({
                    address: proj.address,
                    latitude: proj.latitude,
                    longitude: proj.longitude,
                  });
                  message.success(`Đã tự động điền vị trí của dự án: ${proj.name}`);
                }
              }}
            >
              {projectsList.map(p => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
          </Form.Item>
          */}

          <Form.Item name="title" label="Tiêu đề tin đăng" rules={[{ required: true, message: "Nhập tiêu đề" }]}>
            <Input placeholder="VD: Phòng trọ cao cấp gần Đại học..." size="large" className="font-semibold rounded-md" />
          </Form.Item>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="propertyType" label="Loại hình bất động sản" rules={[{ required: true }]}>
                <Select size="large">
                  <Option value="ROOM">Phòng trọ</Option>
                  <Option value="APARTMENT">Căn hộ</Option>
                  <Option value="HOUSE">Nhà nguyên căn</Option>
                  <Option value="VILLA">Biệt thự</Option>
                  <Option value="COMMERCIAL">Mặt bằng kinh doanh</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="transactionType" label="Loại giao dịch">
                <Select size="large">
                  <Option value="FOR_RENT">Cho thuê</Option>
                  <Option value="FOR_SALE">Rao bán</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" className="text-blue-600 border-blue-200">2. Vị trí & Tiện ích</Divider>
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4 shadow-sm">
            <Form.Item name="address" label="Địa chỉ hiển thị" rules={[{ required: true }]}>
              <Input prefix={<EnvironmentOutlined className="text-red-500" />} placeholder="Số nhà, tên đường, phường, quận..." size="large" />
            </Form.Item>

            <Row gutter={16} className="mb-4">
              <Col span={12}>
                <Form.Item label="Tỉnh/Thành phố (Bắt buộc)" required>
                  <Select
                    size="large"
                    showSearch
                    placeholder="Chọn Tỉnh/Thành phố"
                    onChange={handleProvinceChange}
                    optionFilterProp="children"
                  >
                    {provinces.map(p => <Option key={p.code} value={p.code}>{p.name_with_type || p.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Phường/Xã (Bắt buộc)" required>
                  <Select
                    size="large"
                    showSearch
                    placeholder="Chọn Phường/Xã"
                    onChange={handleWardChange}
                    optionFilterProp="children"
                  >
                    {wards.map(w => <Option key={w.code} value={w.code}>{w.name_with_type || w.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <p className="font-semibold mb-2 text-gray-700">Ghim vị trí chính xác trên bản đồ (sẽ tự động lấy địa chỉ):</p>
            <LocationPicker onCoordinatesChange={handleLocationChange} />
            <Form.Item name="latitude" hidden><Input /></Form.Item>
            <Form.Item name="longitude" hidden><Input /></Form.Item>
            <Form.Item name="province" hidden><Input /></Form.Item>
            <Form.Item name="district" hidden initialValue="Không xác định"><Input /></Form.Item>
            <Form.Item name="ward" hidden><Input /></Form.Item>
            <Form.Item name="street" hidden><Input /></Form.Item>
          </div>

          <Form.Item name="amenities" label="Tiện ích có sẵn">
            <Select mode="multiple" placeholder="Chọn tiện ích (Wifi, Máy lạnh...)" allowClear size="large">
              {amenitiesList.map(a => (
                <Option key={a.id} value={a.name}>{a.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Divider titlePlacement="left" className="text-blue-600 border-blue-200">3. Thông tin chi tiết</Divider>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="price" label="Giá (tháng/tổng)" rules={[{ required: true }]}>
                <Space.Compact className="w-full">
                  <InputNumber className="w-full" size="large" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v.replace(/\$\s?|(,*)/g, '')} />
                  <Button style={{ pointerEvents: 'none' }}>VND</Button>
                </Space.Compact>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="area" label="Diện tích (m2)" rules={[{ required: true }]}>
                <InputNumber className="w-full" size="large" min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={6}><Form.Item name="capacity" label="Sức chứa (người)"><InputNumber min={1} className="w-full" size="large" /></Form.Item></Col>
            <Col span={6}><Form.Item name="bedrooms" label="Số phòng ngủ"><InputNumber min={0} className="w-full" size="large" /></Form.Item></Col>
            <Col span={6}><Form.Item name="bathrooms" label="Số WC"><InputNumber min={0} className="w-full" size="large" /></Form.Item></Col>
            <Col span={6}>
              <Form.Item name="furnishingStatus" label="Nội thất">
                <Select size="large">
                  <Option value="FULLY_FURNISHED">Đầy đủ</Option>
                  <Option value="PARTIALLY_FURNISHED">Cơ bản</Option>
                  <Option value="UNFURNISHED">Trống</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={6}>
              <Form.Item name="hasBalcony" label="Ban công" initialValue={false}>
                <Select size="large">
                  <Option value={true}>Có ban công</Option>
                  <Option value={false}>Không có</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="availabilityStatus" label="Thời gian vào ở" initialValue="IMMEDIATELY">
                <Select size="large">
                  <Option value="IMMEDIATELY">Vào ở ngay</Option>
                  <Option value="THIS_MONTH">Trong tháng này</Option>
                  <Option value="NEXT_MONTH">Đầu tháng sau</Option>
                  <Option value="NEGOTIABLE">Thỏa thuận</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="legalDocumentType" label="Pháp lý" initialValue="NONE">
                <Select size="large">
                  <Option value="NONE">Không cung cấp</Option>
                  <Option value="CERTIFICATE_OF_OWNERSHIP">Sổ đỏ / Sổ hồng</Option>
                  <Option value="LEASE_CONTRACT">Hợp đồng thuê</Option>
                  <Option value="AUTHORIZATION_LETTER">Giấy ủy quyền</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="validityDays" label="Thời hạn tin" initialValue={30}>
                <InputNumber min={1} max={365} className="w-full" size="large" addonAfter="ngày" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="electricityPrice" label="Giá điện" initialValue="NEGOTIABLE">
                <Select size="large">
                  <Option value="FREE">Miễn phí</Option>
                  <Option value="STATE_PRICE">Theo giá nhà nước</Option>
                  <Option value="LANDLORD_PRICE">Theo quy định chủ nhà</Option>
                  <Option value="SHARED">Chia đều</Option>
                  <Option value="NEGOTIABLE">Thỏa thuận</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="waterPrice" label="Giá nước" initialValue="NEGOTIABLE">
                <Select size="large">
                  <Option value="FREE">Miễn phí</Option>
                  <Option value="STATE_PRICE">Theo giá nhà nước</Option>
                  <Option value="LANDLORD_PRICE">Theo quy định chủ nhà</Option>
                  <Option value="SHARED">Chia đều</Option>
                  <Option value="NEGOTIABLE">Thỏa thuận</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="internetPrice" label="Internet" initialValue="NEGOTIABLE">
                <Select size="large">
                  <Option value="FREE">Miễn phí</Option>
                  <Option value="LANDLORD_PRICE">Theo quy định chủ nhà</Option>
                  <Option value="SHARED">Chia đều</Option>
                  <Option value="NEGOTIABLE">Thỏa thuận</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả chi tiết">
            <TextArea rows={5} placeholder="Chia sẻ thêm về quy định phòng, giờ giấc, lối đi riêng..." className="rounded-md" />
          </Form.Item>

          <Divider titlePlacement="left" className="text-blue-600 border-blue-200">4. Hình ảnh & Video thực tế</Divider>
          <Form.Item label="Video giới thiệu (Tùy chọn)">
            <Space.Compact className="w-full">
              <Form.Item name="videoUrl" noStyle>
                <Input prefix={<VideoCameraOutlined className="text-red-500" />} placeholder="URL video sau khi upload..." size="large" />
              </Form.Item>
              <Upload accept="video/*" showUploadList={false} beforeUpload={beforeUploadVideo} customRequest={handleUploadVideo}>
                <Button icon={<UploadOutlined />} loading={videoLoading} className="text-blue-600 font-medium" size="large">
                  {videoLoading ? "Đang tải..." : "Upload Video"}
                </Button>
              </Upload>
            </Space.Compact>
          </Form.Item>
          {currentVideoUrl && (
            <div className="mb-4 text-center bg-gray-100 rounded-lg p-2 border border-gray-200">
              <p className="text-gray-500 text-xs mb-2">Bản xem trước video của bạn</p>
              <video src={currentVideoUrl} controls className="max-w-full rounded mx-auto" style={{ maxHeight: '250px' }} />
            </div>
          )}

          <Form.Item label="Hình ảnh thực tế (Tối đa 5 ảnh)" rules={[{ required: true, message: "Cần ít nhất 1 ảnh" }]}>
            <Upload
              listType="picture-card"
              customRequest={handleUploadImages}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              maxCount={5}
            >
              {fileList.length < 5 && <div><UploadOutlined /><div style={{ marginTop: 8 }}>Thêm ảnh</div></div>}
            </Upload>
          </Form.Item>

          {/* === 5. DỊCH VỤ ĐĂNG TIN === */}
          <Divider titlePlacement="left" className="text-orange-600 border-orange-200">5. Dịch vụ đăng tin & Ưu tiên</Divider>

          {hasActiveMembership ? (
            // HIỂN THỊ KHI ĐÃ CÓ GÓI HỘI VIÊN (VIP)
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200 mb-6 flex items-center justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CrownFilled className="text-yellow-500 text-2xl" />
                  <span className="font-bold text-lg text-orange-700">Đặc quyền Hội viên {user.membershipPackage.name}</span>
                </div>
                <p className="text-gray-600 m-0 text-sm">
                  Hệ thống tự động áp dụng ưu tiên tin đăng theo gói hội viên bạn đã mua.
                  <br /> Thời hạn còn lại: <b className="text-gray-800">{dayjs(user.membershipExpiresAt).format('DD/MM/YYYY')}</b>
                </p>
              </div>
              <Tag color="gold" className="px-4 py-1 font-bold border-none shadow-sm">ĐÃ KÍCH HOẠT</Tag>
              {/* Hidden field để giữ giá trị package ID khi submit */}
              <Form.Item name="servicePackageId" hidden><Input /></Form.Item>
            </div>
          ) : (
            // HIỂN THỊ KHI CHƯA CÓ GÓI HỘI VIÊN
            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-700">Chọn loại tin đăng</span>
                {wallet && (
                  <Tag color="blue" className="px-3 py-1 rounded-full">
                    <span className="font-medium text-blue-700">
                      Số dư ví: {Number(wallet.balance || 0).toLocaleString()} đ
                    </span>
                  </Tag>
                )}
              </div>
              <Form.Item
                name="servicePackageId"
                rules={[{ required: true, message: 'Vui lòng chọn loại tin đăng!' }]}
                initialValue="FREE"
              >
                <Select placeholder="Chọn gói để tăng khả năng tiếp cận khách hàng..." size="large" className="w-full">
                  <Option key="FREE" value="FREE">
                    <div className="flex justify-between items-center w-full py-1">
                      <div className="flex items-center gap-2">
                        <CheckCircleOutlined className="text-gray-400" />
                        <span className="font-bold text-gray-600">Đăng tin Thường</span>
                      </div>
                      <span className="font-bold text-gray-400">Miễn phí</span>
                    </div>
                  </Option>
                  {packagesList
                    .filter(p => p.type === 'MEMBERSHIP')
                    .map(p => {
                      const isVip = p.type === 'VIP' || p.name.toUpperCase().includes('VIP');
                      return (
                        <Option key={p.id} value={p.id}>
                          <div className="flex justify-between items-center w-full py-1">
                            <div className="flex items-center gap-2">
                              {isVip ? <CrownFilled className="text-yellow-500 text-lg" /> : <StarFilled className="text-gray-400" />}
                              <span className={`font-bold ${isVip ? 'text-orange-600' : 'text-gray-700'}`}>{p.name}</span>
                            </div>
                            <span className={`font-bold ${p.price > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {p.price === 0 ? "Miễn phí" : `${p.price?.toLocaleString()} đ`}
                            </span>
                          </div>
                        </Option>
                      );
                    })}
                </Select>
              </Form.Item>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                <Card size="small" className="min-w-[200px] border-orange-200 bg-white">
                  <div className="text-gray-400 text-xs uppercase font-bold mb-1">Gói Thường</div>
                  <div className="text-gray-600 text-[11px]"><CheckCircleOutlined className="text-green-500" /> Hiển thị sau tin VIP</div>
                </Card>
                <Card size="small" className="min-w-[200px] border-yellow-400 bg-yellow-50 shadow-sm">
                  <div className="text-yellow-700 text-xs uppercase font-bold mb-1">Gói VIP</div>
                  <div className="text-gray-700 text-[11px] font-medium"><StarFilled className="text-yellow-500" /> Luôn nằm ở trang đầu</div>
                </Card>
              </div>
            </div>
          )}

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            className="h-14 bg-[#f96302] hover:bg-orange-600 font-bold text-xl shadow-lg rounded-lg border-none"
          >
            XÁC NHẬN ĐĂNG TIN
          </Button>

          <p className="text-center text-gray-400 text-xs mt-4 italic">
            * Bằng việc nhấn đăng tin, bạn đồng ý với Điều khoản và Quy định của Smart Rental.
          </p>
        </Form>
      </Card>
    </div>
  );
};

export default CreateRoom;