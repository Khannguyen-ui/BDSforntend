import React from "react";
import { Row, Col, Typography, Button, Divider, Space } from "antd";
import {
  EnvironmentOutlined,
  PhoneOutlined,
  GlobalOutlined,
  FacebookFilled,
  YoutubeFilled,
  QuestionCircleOutlined,
  MailOutlined,
  HomeOutlined,
} from "@ant-design/icons";

import myQrCode from "../../assets/Qrpro.jpg";
import systemLogo from "../../assets/logo2.png";

const { Text } = Typography;

const Footer = () => {
  const linkClass =
    "text-gray-500 hover:text-[#E03C31] transition-colors text-sm";

  return (
    <footer className="mt-auto bg-gradient-to-br from-[#FAFBFD] via-white to-[#FFF5F4] border-t border-gray-100">
      <div className="container mx-auto px-4 max-w-screen-xl py-12">
        <div className="rounded-[32px] bg-white/90 backdrop-blur border border-gray-100 shadow-[0_18px_60px_rgba(15,23,42,0.06)] p-6 md:p-8">
          <Row gutter={[48, 36]}>
            <Col xs={24} lg={10}>
             <div className="mb-5 flex items-center gap-3">
                            <img
                                src={systemLogo}
                                alt="Homeverse Logo"
                                className="h-12 w-auto object-contain" 
                            />
                            <div>
                  <div className="font-extrabold text-2xl leading-none text-gray-900">
                    Home<span className="text-[#E03C31]">Verse</span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-semibold tracking-wider mt-1">
                    Smart Real Estate Platform
                  </div>
                </div>
              </div>

              <h5 className="font-bold text-sm uppercase mb-3 text-gray-800">
                CÔNG TY CỔ PHẦN HVS VIỆT NAM
              </h5>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <EnvironmentOutlined className="mt-1 text-lg text-[#E03C31]" />
                  <span>
                    Tầng 3, Nopd HCM Central, Sài Gòn, Thành phố Hồ Chí Minh
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <PhoneOutlined className="mt-1 text-lg text-[#E03C31]" />
                  <span>(024) 3562 5239 - (024) 3562 0539</span>
                </div>
              </div>

              <div className="mt-6 flex gap-4 items-center rounded-3xl bg-[#FAFBFD] border border-gray-100 p-3 max-w-[420px]">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                  <img
                    src={myQrCode}
                    alt="QR Code"
                    className="w-[82px] h-[82px] object-contain"
                  />
                </div>

                <div className="flex-1">
                  <span className="text-sm text-gray-700 font-semibold block mb-3">
                    Trải nghiệm HomeVerse trên ứng dụng
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                      alt="Google Play"
                      className="h-[32px] w-auto cursor-pointer hover:opacity-80 transition"
                    />

                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                      alt="App Store"
                      className="h-[32px] w-auto cursor-pointer hover:opacity-80 transition"
                    />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} lg={7}>
              <h5 className="font-bold text-sm uppercase mb-4 text-gray-900">
                Hướng dẫn
              </h5>

              <div className="flex flex-col gap-3">
                <a href="#" className={linkClass}>
                  Về chúng tôi
                </a>
                <a href="#" className={linkClass}>
                  Báo giá & hỗ trợ
                </a>
                <a href="#" className={linkClass}>
                  Câu hỏi thường gặp
                </a>
                <a href="#" className={linkClass}>
                  Góp ý báo lỗi
                </a>
                <a href="#" className={linkClass}>
                  Sitemap
                </a>
              </div>
            </Col>

            <Col xs={12} sm={12} lg={7}>
              <h5 className="font-bold text-sm uppercase mb-4 text-gray-900">
                Quy định
              </h5>

              <div className="flex flex-col gap-3">
                <a href="#" className={linkClass}>
                  Quy định đăng tin
                </a>
                <a href="#" className={linkClass}>
                  Quy chế hoạt động
                </a>
                <a href="#" className={linkClass}>
                  Điều khoản thỏa thuận
                </a>
                <a href="#" className={linkClass}>
                  Chính sách bảo mật
                </a>
                <a href="#" className={linkClass}>
                  Giải quyết khiếu nại
                </a>
              </div>
            </Col>
          </Row>

          <div className="mt-10 flex flex-wrap gap-3 items-center">
            <Button
              type="primary"
              shape="round"
              size="large"
              icon={<PhoneOutlined rotate={90} />}
              className="font-bold h-11 px-6 bg-[#E03C31] border-[#E03C31] shadow-md hover:!bg-[#c92f25] hover:!border-[#c92f25]"
            >
              1900 1865
            </Button>

            <Button
              shape="round"
              size="large"
              icon={<QuestionCircleOutlined />}
              className="h-11 px-6 border-gray-200 bg-white text-gray-700 hover:!text-[#E03C31] hover:!border-[#E03C31]"
            >
              trogiup.homeverse-bds.duckdns.org
            </Button>

            <Button
              shape="round"
              size="large"
              icon={<MailOutlined />}
              className="h-11 px-6 border-gray-200 bg-white text-gray-700 hover:!text-[#E03C31] hover:!border-[#E03C31]"
            >
              hotro@homeverse-bds.duckdns.org
            </Button>
          </div>

          <Divider className="border-gray-100 my-7" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <Text className="text-gray-400">
              Copyright © 2007 - 2026 HomeVerse. All rights reserved.
            </Text>

            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 border border-gray-100 px-4 py-2 rounded-full bg-[#FAFBFD] cursor-pointer hover:bg-white hover:shadow-sm transition">
                <GlobalOutlined className="text-lg text-gray-500" />
                <span className="font-medium text-gray-700">Việt Nam</span>
                <span className="text-[10px] text-gray-400">▼</span>
              </div>

              <Space size="middle">
                <FacebookFilled className="text-3xl text-[#1877F2] cursor-pointer hover:scale-110 transition-transform" />
                <YoutubeFilled className="text-3xl text-[#FF0000] cursor-pointer hover:scale-110 transition-transform" />

                <div className="bg-[#0068FF] text-white font-bold text-[10px] w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:scale-110 transition-transform shadow-sm">
                  Zalo
                </div>
              </Space>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;