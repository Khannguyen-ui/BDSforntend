import React from 'react';
import { Row, Col, Typography, Button, Divider, Space } from 'antd';
import { 
  EnvironmentOutlined, 
  PhoneOutlined, 
  GlobalOutlined, 
  FacebookFilled, 
  YoutubeFilled, 
  QuestionCircleOutlined,
  MailOutlined,
  HomeFilled // Dùng tạm làm logo
} from '@ant-design/icons';

const { Title, Text, Link } = Typography;

const Footer = () => {
  return (
    <footer className="bg-[#F4F4F4] pt-12 pb-6 border-t border-gray-200 mt-auto text-[#2C2C2C]">
      <div className="container mx-auto px-4 max-w-screen-xl">
        
        {/* --- PHẦN 1: THÔNG TIN CÔNG TY & LIÊN KẾT --- */}
        <Row gutter={[48, 32]}>
          
          {/* CỘT 1: THÔNG TIN CÔNG TY */}
          <Col xs={24} lg={11}>
             {/* Logo Fake */}
             <div className="mb-5 flex items-center gap-2">
                <HomeFilled className="text-3xl text-[#E03C31]" />
                <div>
                   <span className="block font-bold text-[#E03C31] text-2xl leading-none">BDS.com.vn</span>
                   <span className="text-[10px] text-gray-500 font-semibold tracking-wider">by ProJSGuru</span>
                </div>
             </div>

             <h5 className="font-bold text-sm uppercase mb-3 text-gray-800">CÔNG TY CỔ PHẦN ProJSGuru VIỆT NAM</h5>
             
             <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                    <EnvironmentOutlined className="mt-1 text-lg"/>
                    <span>Tầng 31, Nopd HCM Landmark, Sai Gon, Ho Chi Minh</span>
                </div>
                <div className="flex items-start gap-3">
                    <PhoneOutlined className="mt-1 text-lg"/>
                    <span>(024) 3562 5939 - (024) 3562 5940</span>
                </div>
             </div>

             {/* Phần tải ứng dụng (QR & Store Badges) */}
             <div className="mt-6 flex gap-4 items-center">
                {/* QR Code Placeholder */}
                <div className="bg-white p-1 rounded-md shadow-sm">
                    <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://batdongsan.com.vn" 
                        alt="QR Code" 
                        className="w-[80px] h-[80px]" 
                    />
                </div>
                
                <div className="flex flex-col justify-between h-[80px]">
                    <span className="text-sm text-gray-700 font-medium">
                        Trải nghiệm BDS.com.vn trên ứng dụng
                    </span>
                    <div className="flex flex-col gap-2 mt-auto">
                         {/* Google Play Badge */}
                        <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                            alt="Google Play" 
                            className="h-[30px] w-auto cursor-pointer" 
                        />
                        {/* App Store Badge */}
                        <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                            alt="App Store" 
                            className="h-[30px] w-auto cursor-pointer" 
                        />
                    </div>
                </div>
             </div>
          </Col>

          {/* CỘT 2: HƯỚNG DẪN */}
          <Col xs={12} sm={12} lg={6} className="lg:pl-10">
            <h5 className="font-bold text-sm mb-4 text-gray-800">Hướng dẫn</h5>
            <div className="flex flex-col gap-3 text-sm">
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Về chúng tôi</a>
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Báo giá & hỗ trợ</a>
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Câu hỏi thường gặp</a>
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Góp ý báo lỗi</a>
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Sitemap</a>
            </div>
          </Col>

          {/* CỘT 3: QUY ĐỊNH */}
          <Col xs={12} sm={12} lg={7}>
            <h5 className="font-bold text-sm mb-4 text-gray-800">Quy định</h5>
            <div className="flex flex-col gap-3 text-sm">
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Quy định đăng tin</a>
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Quy chế hoạt động</a>
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Điều khoản thỏa thuận</a>
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Chính sách bảo mật</a>
                <a href="#" className="text-gray-600 hover:text-[#E03C31] hover:underline transition-colors">Giải quyết khiếu nại</a>
            </div>
          </Col>
        </Row>

        {/* --- PHẦN 2: BUTTONS LIÊN HỆ --- */}
        <div className="mt-10 flex flex-wrap gap-4 items-center">
            {/* Nút Hotline Đỏ */}
            <Button 
                type="primary" 
                danger 
                shape="round" 
                size="large" 
                icon={<PhoneOutlined rotate={90} />} 
                className="font-bold h-10 px-6 bg-[#D0021B] border-[#D0021B] hover:bg-[#b00217]"
            >
                1900 1865
            </Button>

            {/* Nút Hỗ trợ Trắng */}
            <Button 
                shape="round" 
                size="large" 
                icon={<QuestionCircleOutlined />}
                className="h-10 px-6 border-gray-400 text-gray-700 hover:text-[#D0021B] hover:border-[#D0021B]"
            >
                trogiup.bds.com.vn
            </Button>

            {/* Nút Email Trắng */}
            <Button 
                shape="round" 
                size="large" 
                icon={<MailOutlined />}
                className="h-10 px-6 border-gray-400 text-gray-700 hover:text-[#D0021B] hover:border-[#D0021B]"
            >
                hotro@bds.com.vn
            </Button>
        </div>

        {/* --- DIVIDER --- */}
        <Divider className="border-gray-300 my-6" />

        {/* --- PHẦN 3: COPYRIGHT & SOCIAL & LANG --- */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <Text className="text-gray-500">
                Copyright © 2007 - 2026 BDS.com.vn
            </Text>

            <div className="flex items-center gap-6">
                {/* Nút chọn ngôn ngữ/quốc gia */}
                <div className="flex items-center gap-2 border border-gray-300 px-3 py-1.5 rounded-full bg-white cursor-pointer hover:bg-gray-50 transition">
                    <GlobalOutlined className="text-lg text-gray-600" />
                    <span className="font-medium text-gray-700">Việt Nam</span>
                    <span className="text-[10px] ml-1">▼</span>
                </div>

                {/* Social Icons */}
                <Space size="middle">
                    <FacebookFilled className="text-3xl text-[#1877F2] cursor-pointer hover:opacity-80 transition"/>
                    <YoutubeFilled className="text-3xl text-[#FF0000] cursor-pointer hover:opacity-80 transition"/>
                    {/* Fake Zalo Icon */}
                    <div className="bg-[#0068FF] text-white font-bold text-[10px] w-7 h-7 flex items-center justify-center rounded-full cursor-pointer hover:opacity-80 transition">
                        Zalo
                    </div>
                </Space>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;