import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Upload, Card, Row, Col, Divider, Space, App } from 'antd';
import {
  UploadOutlined, EnvironmentOutlined, VideoCameraOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import roomService from '../../services/roomService';
import LocationPicker from '../../components/shared/LocationPicker';

import provinceData from '../../data/province.json';
import wardData from '../../data/ward.json';

const { Option } = Select;
const { TextArea } = Input;

const CreateRoom = () => {

  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // State quản lý upload
  const [fileList, setFileList] = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);

  // State dữ liệu danh mục
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);

  const [quota, setQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  // Thêm state để điều khiển UI của 2 ô Select không nằm trong Form
  const [selectedProvinceCode, setSelectedProvinceCode] = useState(undefined);
  const [selectedWardCode, setSelectedWardCode] = useState(undefined);

  useEffect(() => {
    // Chuyển object thành mảng cho danh sách Tỉnh
    setProvinces(Object.values(provinceData || {}));
  }, []);

  const handleProvinceChange = (val, opt) => {
    setSelectedProvinceCode(val);
    setSelectedWardCode(undefined);
    form.setFieldsValue({ province: opt.children, ward: undefined });
    const filteredWards = Object.values(wardData || {}).filter(w => w.parent_code === String(val));
    setWards(filteredWards);
  };

  const handleWardChange = (val, opt) => {
    setSelectedWardCode(val);
    form.setFieldsValue({ ward: opt.children });
  };

  const currentVideoUrl = Form.useWatch('videoUrl', form);


  useEffect(() => {
    const fetchMasterData = async () => {
      const results = await Promise.allSettled([
        roomService.getAllAmenities(),
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
        const projRes = results[1].value;
        const projData = projRes.data?.content || projRes.data?.result?.content || projRes.data?.result || projRes.data || [];
        setProjectsList(Array.isArray(projData) ? projData : []);
      } else {
        console.error("Lỗi tải dự án:", results[1].reason);
        setProjectsList([]);
      }


    };
    fetchMasterData();
  }, []);

  const fetchMyQuota = async () => {
    try {
      setQuotaLoading(true);
      const res = await roomService.getMyQuota();
      const data = res.data?.result || res.data?.data || res.data;
      setQuota(data);
      return data;
    } catch (error) {
      console.error("Lỗi tải quota:", error);
      return null;
    } finally {
      setQuotaLoading(false);
    }
  };
  useEffect(() => {
    fetchMyQuota();
  }, []);

  const handleLocationChange = (lat, lng, addressData) => {
    form.setFieldsValue({ latitude: lat, longitude: lng });
    if (addressData) {
      form.setFieldsValue({
        address: addressData.fullAddress,
        street: addressData.street
      });

      // Tự động suy luận Tỉnh/Thành phố từ dữ liệu trả về
      let detectedProvince = provinces.find(p => 
        p.name === addressData.province || 
        p.name_with_type === addressData.province ||
        (addressData.fullAddress && addressData.fullAddress.includes(p.name))
      );

      if (detectedProvince) {
        setSelectedProvinceCode(detectedProvince.code);
        form.setFieldsValue({ province: detectedProvince.name_with_type || detectedProvince.name });
        
        const filteredWards = Object.values(wardData || {}).filter(
          w => w.parent_code === String(detectedProvince.code)
        );
        setWards(filteredWards);

        // Tự động suy luận Phường/Xã sau khi có Tỉnh
        let detectedWard = filteredWards.find(w => 
          w.name === addressData.ward || 
          w.name_with_type === addressData.ward ||
          (addressData.fullAddress && addressData.fullAddress.includes(w.name))
        );

        if (detectedWard) {
          setSelectedWardCode(detectedWard.code);
          form.setFieldsValue({ ward: detectedWard.name_with_type || detectedWard.name });
        } else {
          setSelectedWardCode(undefined);
          form.setFieldsValue({ ward: undefined });
        }
      } else {
        setSelectedProvinceCode(undefined);
        setSelectedWardCode(undefined);
        setWards([]);
        form.setFieldsValue({ province: undefined, ward: undefined });
      }
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
    const latestQuota = quota ?? await fetchMyQuota();
    const remainingQuota = latestQuota?.freePostsRemaining ?? 0;

    if (remainingQuota <= 0) {
      modal.confirm({
        title: 'Bạn đã hết lượt đăng tin',
        content: 'Vui lòng mua gói lượt đăng tin để tiếp tục đăng bài.',
        okText: 'Mua gói ngay',
        cancelText: 'Để sau',
        onOk: () => navigate('/landlord/vip-packages')
      });
      return;
    }
    setLoading(true);
    try {

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

      await roomService.createRoom(payload);
      await fetchMyQuota();

      message.success("Đăng tin thành công! Tin của bạn đang chờ phê duyệt.");
      navigate('/landlord/room-list');

    } catch (error) {
      console.error("LỖI TỪ BACKEND:", error);

      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Đăng tin thất bại';

      const lowerMsg = String(errorMsg).toLowerCase();

      const isQuotaError =
        lowerMsg.includes('quota') ||
        lowerMsg.includes('lượt đăng') ||
        lowerMsg.includes('hết lượt') ||
        lowerMsg.includes('post_limit') ||
        lowerMsg.includes('post_limit_exceeded');

      if (isQuotaError) {
        modal.confirm({
          title: 'Bạn đã hết lượt đăng tin',
          content: 'Vui lòng mua gói lượt đăng tin để tiếp tục đăng bài.',
          okText: 'Mua gói ngay',
          cancelText: 'Để sau',
          onOk: () => navigate('/landlord/vip-packages')
        });
        return;
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
  const isQuotaReady = quota !== null;
  const remainingQuota = quota?.freePostsRemaining ?? 0;
  const isOutOfQuota = isQuotaReady && !quotaLoading && remainingQuota <= 0;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-[#f8f9fa]">
      <Card
        title={<span className="text-lg font-bold text-blue-700"><HomeOutlined /> ĐĂNG TIN PHÒNG TRỌ MỚI</span>}
        className="shadow-xl rounded-xl border-t-4 border-blue-600"
      >
        <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-800">Lượt đăng còn lại</div>
            <div className="text-sm text-gray-500">
              Mỗi bài gửi duyệt sẽ giữ trước 1 lượt. Nếu bị từ chối, hệ thống hoàn lại lượt.
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-[#f96302]">
              {quotaLoading ? '...' : (quota?.freePostsRemaining ?? 0)}
            </div>
            <div className="text-xs text-gray-500">tin</div>
          </div>
        </div>
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

          <Form.Item
            name="projectId"
            label="Thuộc dự án / khu trọ"
            tooltip="Nếu bài đăng thuộc một dự án hoặc khu trọ đã có trong hệ thống, hãy chọn để liên kết dữ liệu."
          >
            <Select
              showSearch
              allowClear
              size="large"
              placeholder="Chọn dự án/khu trọ nếu có..."
              optionFilterProp="children"
              onChange={(val) => {
                const proj = projectsList.find(p => p.id === val);

                if (!proj) return;

                // Khai báo biến lưu Tỉnh/Xã tìm được
                let detectedProvince = null;
                let detectedWard = null;

                // Phân tích address để tự suy luận nếu backend không trả về proj.province
                const addressParts = proj.address ? proj.address.split(',').map(s => s.trim()) : [];
                
                // 1. Tìm Tỉnh
                detectedProvince = provinces.find(p => 
                  p.name_with_type === proj.province || 
                  p.name === proj.province ||
                  addressParts.includes(p.name_with_type) || 
                  addressParts.includes(p.name)
                );

                if (detectedProvince) {
                  setSelectedProvinceCode(detectedProvince.code);
                  
                  const filteredWards = Object.values(wardData || {}).filter(
                    w => w.parent_code === String(detectedProvince.code)
                  );
                  setWards(filteredWards);

                  // 2. Tìm Phường/Xã
                  detectedWard = filteredWards.find(w => 
                    w.name_with_type === proj.ward || 
                    w.name === proj.ward ||
                    addressParts.includes(w.name_with_type) || 
                    addressParts.includes(w.name)
                  );

                  if (detectedWard) {
                    setSelectedWardCode(detectedWard.code);
                  } else {
                    setSelectedWardCode(undefined);
                  }
                } else {
                  setSelectedProvinceCode(undefined);
                  setSelectedWardCode(undefined);
                  setWards([]);
                }

                // Tự động điền full thông tin địa chỉ từ dự án
                form.setFieldsValue({
                  address: proj.address || form.getFieldValue('address'),
                  latitude: proj.latitude || form.getFieldValue('latitude'),
                  longitude: proj.longitude || form.getFieldValue('longitude'),
                  province: detectedProvince ? (detectedProvince.name_with_type || detectedProvince.name) : (proj.province || form.getFieldValue('province')),
                  district: proj.district || form.getFieldValue('district'),
                  ward: detectedWard ? (detectedWard.name_with_type || detectedWard.name) : (proj.ward || form.getFieldValue('ward'))
                });

                message.success(`Đã chọn dự án: ${proj.name}`);
              }}
            >
              {projectsList.map(p => (
                <Option key={p.id} value={p.id}>
                  {p.name} {p.address ? `- ${p.address}` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

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
                    value={selectedProvinceCode}
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
                    value={selectedWardCode}
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

          <Divider titlePlacement="left" className="text-orange-600 border-orange-200">
            5. Xác nhận đăng tin
          </Divider>

          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
            <p className="m-0 text-sm text-gray-700">
              Hệ thống sẽ kiểm tra lượt đăng tin còn lại của tài khoản khi bạn gửi bài.
              Nếu đã hết lượt, bạn sẽ được chuyển sang trang mua gói lượt đăng tin.
            </p>
            <p className="m-0 mt-2 text-xs text-gray-500">
              Sau khi bài được tạo, bạn có thể vào mục “Tin đã đăng” để mua gói đẩy tin/VIP cho từng bài.
            </p>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            disabled={quotaLoading || isOutOfQuota}
            className="h-14 bg-[#f96302] hover:bg-orange-600 font-bold text-xl shadow-lg rounded-lg border-none disabled:bg-gray-300 disabled:text-gray-500"
          >
            {quotaLoading ? 'ĐANG KIỂM TRA LƯỢT ĐĂNG...' : isOutOfQuota ? 'HẾT LƯỢT ĐĂNG TIN' : 'XÁC NHẬN ĐĂNG TIN'}
          </Button>
          {isOutOfQuota && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-red-700">Bạn đã hết lượt đăng tin</div>
                <div className="text-sm text-red-500">
                  Vui lòng mua thêm gói lượt đăng để tiếp tục gửi bài.
                </div>
              </div>

              <Button
                type="primary"
                className="bg-[#f96302] border-none font-semibold"
                onClick={() => navigate('/landlord/vip-packages')}
              >
                Mua gói ngay
              </Button>
            </div>
          )}

          <p className="text-center text-gray-400 text-xs mt-4 italic">
            * Bằng việc nhấn đăng tin, bạn đồng ý với Điều khoản và Quy định của Smart Rental.
          </p>
        </Form>
      </Card>
    </div>
  );
};

export default CreateRoom;