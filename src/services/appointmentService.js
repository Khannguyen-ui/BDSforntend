import axiosClient from '../config/axiosClient';

const appointmentService = {
    // 1. Lấy danh sách lịch hẹn
    getMyCalendar: () => {
        return axiosClient.get('/appointments/my-calendar');
    },

    // 2. Cập nhật trạng thái (Duyệt/Hủy/Từ chối)
    updateStatus: (id, status) => {
        return axiosClient.put(`/appointments/${id}/status`, null, {
            params: { status } 
        });
    },

    // 3. Tạo lịch hẹn mới
    create: (data) => {
        return axiosClient.post('/appointments', data);
    },

    // --- [MỚI] 4. Chủ trọ đề xuất giờ mới ---
    suggestNewTime: (id, newTime, note) => {
        // newTime format: yyyy-MM-ddTHH:mm:ss
        return axiosClient.put(`/appointments/${id}/suggest`, null, {
            params: { newTime, note }
        });
    },

    // --- [MỚI] 5. Khách đồng ý giờ đề xuất ---
    acceptSuggestion: (id) => {
        return axiosClient.put(`/appointments/${id}/accept-suggestion`);
    }
};

export default appointmentService;