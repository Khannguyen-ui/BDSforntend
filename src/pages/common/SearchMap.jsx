import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../../utils/imageHelper';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Card, List, Tag, Typography, Spin, Image, Button, message, Empty, Avatar } from 'antd';
import {
  EnvironmentOutlined, ArrowLeftOutlined, AimOutlined,
  FullscreenOutlined, FullscreenExitOutlined, DoubleLeftOutlined, DoubleRightOutlined,
  CrownFilled
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import roomService from '../../services/roomService';

const { Text, Title } = Typography;

// --- CẤU HÌNH ICON (Giữ nguyên) ---
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
// Sẽ thay thế bằng icon custom bên dưới
// L.Marker.prototype.options.icon = DefaultIcon;

const createCustomIcon = (room) => {
  const isVip = room.priorityLevel > 0 || room.isPromoted;
  // Pin SVG tùy chỉnh (Màu cam)
  const svgPin = `
    <svg width="36" height="46" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16344 0 0 7.16344 0 16C0 27.2 16 40 16 40C16 40 32 27.2 32 16C32 7.16344 24.8366 0 16 0ZM16 22C12.6863 22 10 19.3137 10 16C10 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22Z" fill="${isVip ? '#fadb14' : '#f96302'}"/>
      ${isVip ? '<circle cx="16" cy="16" r="4" fill="#f96302"/>' : '<circle cx="16" cy="16" r="4" fill="white"/>'}
    </svg>
  `;

  return L.divIcon({
    html: `
      <div class="relative group cursor-pointer drop-shadow-lg hover:-translate-y-2 transition-transform duration-300">
        ${svgPin}
        ${isVip ? '<div class="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 rounded shadow animate-bounce">HOT</div>' : ''}
      </div>
    `,
    className: 'bg-transparent border-none', // Xóa class mặc định của leaflet
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46]
  });
};

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 14, { duration: 1.5 });
      // Cập nhật lại kích thước khi container thay đổi
      setTimeout(() => map.invalidateSize(), 500);
    }
  }, [lat, lng]);
  return null;
};

// Cập nhật dữ liệu khi người dùng kéo hoặc zoom bản đồ
const MapEventHandler = ({ onMapChange }) => {
  const map = useMap();
  
  useEffect(() => {
    // Gọi lần đầu khi map load xong
    onMapChange(map);
  }, [map]);

  useMapEvents({
    moveend: (e) => onMapChange(e.target),
    zoomend: (e) => onMapChange(e.target)
  });
  
  return null;
};

const SearchMap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State điều khiển mở rộng bản đồ
  const [isExpanded, setIsExpanded] = useState(false);

  const initialLat = parseFloat(searchParams.get('lat')) || 10.7769;
  const initialLng = parseFloat(searchParams.get('lng')) || 106.7009;
  const initialRadius = parseInt(searchParams.get('radius')) || 5000;

  const [center, setCenter] = useState({ lat: initialLat, lng: initialLng });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleMapChange = (map) => {
    const currentCenter = map.getCenter();
    const bounds = map.getBounds();
    const radiusMeters = map.distance(currentCenter, bounds.getNorthEast());
    const radiusKm = Math.max(1, Math.round(radiusMeters / 1000));
    
    fetchRooms({ 
      latitude: currentCenter.lat, 
      longitude: currentCenter.lng, 
      radiusKm 
    });
  };

  const fetchRooms = async (apiParams) => {
    setLoading(true);
    try {
      // Lấy các bộ lọc từ URL (giá, loại phòng...) gộp chung với tọa độ/bán kính của Map
      const urlParams = Object.fromEntries(searchParams.entries());
      const finalParams = { ...urlParams, ...apiParams, size: 50 }; // Lấy 50 phòng trên bản đồ
      
      const res = await roomService.searchRooms(finalParams);
      const fetchedRooms = res.data?.content || [];
      //console.log("Dữ liệu phòng nhận được từ API:", fetchedRooms.slice(0, 3));
      setRooms(fetchedRooms);
    } catch (error) {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Sử dụng overflow-hidden để tránh hiện thanh cuộn ngang khi đang transition
    <div className="flex h-[calc(100vh-64px)] flex-row bg-white overflow-hidden font-sans">

      {/* --- PANEL DANH SÁCH (Sẽ bị đẩy sang trái) --- */}
      <div
        className={`transition-all duration-500 ease-in-out border-r flex flex-col shadow-2xl z-20 bg-white
          ${isExpanded ? 'w-[0px] md:w-[80px] opacity-0 md:opacity-100' : 'w-full md:w-[420px]'}`}
      >
        <div className={`p-4 border-b whitespace-nowrap ${isExpanded ? 'hidden' : 'block'}`}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} className="mb-2 p-0">Quay lại</Button>
          <Title level={4} className="m-0 uppercase text-sm tracking-widest text-orange-600">Phòng gần bạn</Title>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-40"><Spin /></div>
          ) : isExpanded ? (
            // Khi mở rộng, chỉ hiện các icon nhỏ hoặc thumbnail tối giản
            <div className="flex flex-col items-center gap-4 py-4">
              {rooms.slice(0, 5).map(r => <Avatar key={r.id} src={getImageUrl(r)} size={50} className="border-2 border-orange-500 shadow-md cursor-pointer" onClick={() => setIsExpanded(false)} />)}
              <div className="text-[10px] font-bold text-gray-400 rotate-90 mt-4 whitespace-nowrap uppercase tracking-tighter">Danh sách đang ẩn</div>
            </div>
          ) : (
            <List
              dataSource={rooms}
              renderItem={(item) => (
                <Card
                  hoverable
                  className="mb-3 rounded-xl overflow-hidden border-none shadow-sm hover:shadow-md"
                  styles={{ body: { padding: 10 } }}
                  onClick={() => navigate(`/rooms/${item.id}`)}
                >
                  <div className="flex gap-3">
                    <Image src={getImageUrl(item)} width={100} height={80} className="object-cover rounded-lg" preview={false} />
                    <div className="flex-1 min-w-0">
                      <Text strong className="text-gray-800 block truncate text-[13px]">{item.title}</Text>
                      <Text className="text-red-600 font-bold block">{item.price?.toLocaleString()} đ</Text>
                      <div className="text-[10px] text-gray-400 truncate mt-1"><EnvironmentOutlined /> {item.address}</div>
                    </div>
                  </div>
                </Card>
              )}
            />
          )}
        </div>
      </div>

      {/* --- BẢN ĐỒ (Sẽ chiếm hết góc phải) --- */}
      <div className="flex-1 relative transition-all duration-500">
        {/* NÚT ĐIỀU KHIỂN MỞ RỘNG (FLOATING ACTION BUTTON) */}
        <div className="absolute top-1/2 -left-4 z-[1000] -translate-y-1/2 hidden md:block">
          <Button
            shape="circle"
            type="primary"
            className="bg-orange-600 border-white border-2 w-10 h-10 shadow-2xl flex items-center justify-center hover:bg-orange-500 transition-all"
            icon={isExpanded ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </div>

        <MapContainer
          center={[center.lat, center.lng]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false} // Tắt zoom mặc định để tự tùy biến vị trí
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap lat={center.lat} lng={center.lng} />
          <MapEventHandler onMapChange={handleMapChange} />

          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            spiderfyOnMaxZoom={true}
            iconCreateFunction={(cluster) => {
              return L.divIcon({
                html: `
                  <div class="relative flex items-center justify-center w-14 h-14">
                    <div class="absolute inset-0 bg-[#f96302] opacity-40 rounded-full animate-ping"></div>
                    <div class="relative z-10 flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff8c3a] to-[#f96302] text-white font-bold rounded-full border-2 border-white shadow-xl text-base ring-4 ring-[#f96302]/20">
                      ${cluster.getChildCount()}
                    </div>
                  </div>
                `,
                className: 'bg-transparent border-none',
                iconSize: [56, 56],
                iconAnchor: [28, 28]
              });
            }}
          >
            {rooms
              .filter(room => (room.latitude != null && room.longitude != null) || (room.lat != null && room.lng != null) || (room.location?.lat != null && room.location?.lon != null))
              .map(room => {
                const markerLat = room.latitude || room.lat || room.location?.lat;
                const markerLng = room.longitude || room.lng || room.location?.lon;
                const isVip = room.priorityLevel > 0 || room.isPromoted || room.promotionPackageId || room.promotionPackageName;
                //console.log(`[Bản đồ] Vẽ ghim phòng ID: ${room.id} - ${room.title} tại tọa độ (Lat: ${markerLat}, Lng: ${markerLng})`);
                return (
                  <Marker key={room.id} position={[markerLat, markerLng]} icon={createCustomIcon(room)}>
                    <Popup className="custom-popup">
                      <div className="w-52 p-0 overflow-hidden cursor-pointer group" onClick={() => navigate(`/rooms/${room.id}`)}>
                        <div className="relative overflow-hidden rounded-t-lg">
                          <img src={getImageUrl(room)} className="w-full h-28 object-cover transition-transform duration-300 group-hover:scale-110" />
                          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm z-10">
                            <EnvironmentOutlined /> {room.district || 'Khu vực'}
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded-b-lg">
                          <div className={`font-bold line-clamp-2 text-sm leading-tight transition-colors mb-1 ${isVip ? 'text-[#f96302]' : 'text-gray-800 group-hover:text-[#f96302]'}`}>
                            {isVip && <CrownFilled className="text-[#fadb14] mr-1" />} {room.title}
                          </div>
                          <div className="text-[#f96302] font-bold text-base">{room.price?.toLocaleString()} đ<span className="text-gray-400 text-xs font-normal">/tháng</span></div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Nút định vị & Zoom */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <Button
            size="large" icon={<AimOutlined />}
            className="shadow-md font-bold text-orange-600 bg-white"
            onClick={() => {
              navigator.geolocation.getCurrentPosition(pos => {
                const { latitude, longitude } = pos.coords;
                // Cập nhật tọa độ trung tâm, bản đồ sẽ tự flyTo và kích hoạt MapEventHandler -> tự fetchRooms
                setCenter({ lat: latitude, lng: longitude });
              });
            }}
          />
          <Button
            size="large"
            icon={isExpanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            className="shadow-md font-bold text-gray-700 bg-white"
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </div>
      </div>
    </div>
  );
};

export default SearchMap;