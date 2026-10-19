const en = {
  starting: 'Starting camera…',
  connecting: 'Connecting…',
  live: 'Live',
  ended: 'Session ended. Scan a new QR code on the computer.',
  invalidLink: 'Invalid link. Scan the QR code on the computer again.',
  rejected: 'This QR code is no longer valid. Scan the new one on the computer.',
  permissionDenied:
    'Camera access was blocked. Allow camera access for this site in your browser settings, then reload.',
  cameraError: 'Could not open the camera.',
  capture: 'Take photo',
  switchCamera: 'Switch camera',
  torch: 'Toggle flashlight',
  sent: 'Photo sent ✓',
  sendFailed: 'Could not send photo',
};

export type Messages = typeof en;

const vi: Messages = {
  starting: 'Đang mở camera…',
  connecting: 'Đang kết nối…',
  live: 'Đang phát trực tiếp',
  ended: 'Phiên đã kết thúc. Quét mã QR mới trên máy tính.',
  invalidLink: 'Liên kết không hợp lệ. Quét lại mã QR trên máy tính.',
  rejected: 'Mã QR này không còn hiệu lực. Quét mã mới trên máy tính.',
  permissionDenied:
    'Quyền camera đã bị chặn. Hãy cho phép camera cho trang này trong cài đặt trình duyệt rồi tải lại.',
  cameraError: 'Không mở được camera.',
  capture: 'Chụp ảnh',
  switchCamera: 'Đổi camera',
  torch: 'Bật/tắt đèn flash',
  sent: 'Đã gửi ảnh ✓',
  sendFailed: 'Gửi ảnh thất bại',
};

export const t: Messages = navigator.language.toLowerCase().startsWith('vi') ? vi : en;
