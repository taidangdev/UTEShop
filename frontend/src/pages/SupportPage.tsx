import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    FiBookOpen,
    FiTruck,
    FiRefreshCw,
    FiUser,
    FiChevronDown,
    FiChevronUp,
    FiSearch,
    FiMapPin,
    FiMail,
    FiPhone,
    FiClock,
    FiSend,
    FiCheckCircle,
    FiMessageSquare
} from 'react-icons/fi';

const PRIMARY = '#004AC6';
const TEXT = '#191B23';
const TEXT_BODY = '#434655';
const SURFACE = '#F3F3FE';

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const FAQ_DATA: FAQItem[] = [
    {
        category: 'delivery',
        question: 'Giao hàng nội khu HCMUTE (Campus Delivery) hoạt động thế nào?',
        answer: 'Tất cả các đơn hàng chọn giao nhận tại trường sẽ được chuyển trực tiếp đến sảnh các tòa nhà khoa hoặc cổng ký túc xá. Nhân viên giao hàng (là cộng tác viên sinh viên) sẽ liên hệ qua điện thoại và thông báo địa điểm cụ thể cho bạn.'
    },
    {
        category: 'consignment',
        question: 'Làm thế nào để tôi có thể ký gửi giáo trình hoặc dụng cụ học tập cũ?',
        answer: 'Bạn chỉ cần truy cập vào mục "Ký gửi" trên thanh điều hướng, điền thông tin mô tả sản phẩm, tình trạng thực tế và mức giá mong muốn. Sau khi hệ thống phê duyệt trực tuyến, bạn hãy mang sản phẩm đến góc dịch vụ sinh viên UTEShop tại trường để đối chiếu thực tế và lưu kho.'
    },
    {
        category: 'payment',
        question: 'Tôi có thể thanh toán bằng những phương thức nào?',
        answer: 'UTEShop hỗ trợ 3 hình thức thanh toán linh hoạt: Tiền mặt khi nhận hàng (COD), Chuyển khoản ngân hàng qua mã QR động và Thanh toán bằng thẻ tín dụng/thẻ ghi nợ trực tuyến.'
    },
    {
        category: 'warranty',
        question: 'Chính sách bảo hành đối với các thiết bị kỹ thuật, bo mạch thí nghiệm ra sao?',
        answer: 'Các thiết bị phần cứng hoặc dụng cụ kỹ thuật bán trên UTEShop đều đi kèm gói bảo hành tiêu chuẩn từ 3 đến 6 tháng. Đối với sản phẩm ký gửi đã qua sử dụng, chúng tôi hỗ trợ chính sách bao test đổi trả trong vòng 7 ngày đầu nếu có lỗi kỹ thuật phát sinh.'
    },
    {
        category: 'account',
        question: 'Sinh viên UTE có nhận được ưu đãi đặc biệt nào không?',
        answer: 'Khi đăng ký tài khoản bằng email sinh viên (@student.hcmute.edu.vn) hoặc cập nhật MSSV trong trang cá nhân, bạn sẽ được tự động xếp hạng Sinh viên để nhận mã giảm giá độc quyền, tích điểm thưởng đổi quà và miễn phí giao hàng nội khu.'
    }
];

export default function SupportPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Contact Form States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [studentId, setStudentId] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [formSubmitted, setFormSubmitted] = useState(false);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const handleFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (name.trim() && email.trim() && message.trim()) {
            setFormSubmitted(true);
            setTimeout(() => {
                setFormSubmitted(false);
                setName('');
                setEmail('');
                setStudentId('');
                setSubject('');
                setMessage('');
            }, 5000);
        }
    };

    const categories = [
        { id: 'all', label: 'Tất cả' },
        { id: 'delivery', label: 'Vận chuyển' },
        { id: 'consignment', label: 'Ký gửi & Mua bán' },
        { id: 'payment', label: 'Thanh toán' },
        { id: 'warranty', label: 'Bảo hành & Đổi trả' },
        { id: 'account', label: 'Tài khoản & Điểm' }
    ];

    const filteredFAQs = FAQ_DATA.filter((faq) => {
        const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-[#FAF8FF] font-inter text-[#191B23]">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-white py-16 md:py-24 border-b border-outline-variant/25">
                <div
                    className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-primary/5 to-transparent lg:block"
                    aria-hidden="true"
                />
                <div className="mx-auto max-w-[1280px] px-6 text-center lg:px-8">
                    <span 
                        className="inline-flex rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wider"
                        style={{ backgroundColor: 'rgba(0, 74, 198, 0.1)', color: PRIMARY }}
                    >
                        Hỗ trợ &amp; Liên hệ
                    </span>
                    <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: TEXT }}>
                        Trung tâm hỗ trợ sinh viên
                    </h1>
                    <p className="mt-4 text-lg" style={{ color: TEXT_BODY }}>
                        Giải đáp các thắc mắc về đơn hàng, ký gửi hoặc gửi tin nhắn trực tiếp đến ban quản trị UTEShop.
                    </p>

                    {/* Search Bar */}
                    <div className="relative mx-auto mt-8 max-w-xl">
                        <FiSearch
                            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                            style={{ color: TEXT_BODY }}
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Nhập từ khóa câu hỏi (ví dụ: ký gửi, giao hàng...)"
                            className="h-14 w-full rounded-full border border-gray-200 bg-surface pl-12 pr-6 text-base outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
                            style={{ backgroundColor: SURFACE }}
                        />
                    </div>
                </div>
            </section>

            {/* Quick Links / Grid Categories */}
            <section className="mx-auto max-w-[1280px] px-6 py-16 lg:px-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="group rounded-2xl border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary transition-transform duration-300 group-hover:scale-110">
                            <FiTruck className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 font-bold text-lg">Giao hàng nội khu</h3>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
                            Nhận hàng ngay tại lớp, sảnh giảng đường hoặc ký túc xá HCMUTE tiện lợi.
                        </p>
                    </div>

                    <div className="group rounded-2xl border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-primary transition-transform duration-300 group-hover:scale-110">
                            <FiRefreshCw className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 font-bold text-lg">Ký gửi hàng cũ</h3>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
                            Giải phóng sách giáo trình cũ, linh kiện thí nghiệm không dùng tới nhanh gọn.
                        </p>
                    </div>

                    <div className="group rounded-2xl border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-primary transition-transform duration-300 group-hover:scale-110">
                            <FiBookOpen className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 font-bold text-lg">Học cụ &amp; Tài liệu</h3>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
                            Tra cứu danh sách vật tư chuyên ngành đề xuất bởi các giảng viên UTE.
                        </p>
                    </div>

                    <div className="group rounded-2xl border border-white/40 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-primary transition-transform duration-300 group-hover:scale-110">
                            <FiUser className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 font-bold text-lg">Quyền lợi sinh viên</h3>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
                            Chính sách ưu đãi và cơ chế tích điểm cho sinh viên có tài khoản xác thực.
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ Accordion Section */}
            <section className="bg-white py-16 border-y border-outline-variant/20">
                <div className="mx-auto max-w-[800px] px-6">
                    <h2 className="text-center text-3xl font-bold tracking-tight mb-8" style={{ color: TEXT }}>
                        Câu hỏi thường gặp (FAQs)
                    </h2>

                    {/* Categories Tabs */}
                    <div className="mb-8 flex flex-wrap justify-center gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                    selectedCategory === cat.id
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-surface hover:bg-gray-200'
                                }`}
                                style={selectedCategory === cat.id ? { backgroundColor: PRIMARY } : { backgroundColor: SURFACE, color: TEXT_BODY }}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* FAQ List */}
                    {filteredFAQs.length > 0 ? (
                        <div className="space-y-4">
                            {filteredFAQs.map((faq, idx) => {
                                const isOpen = openIndex === idx;
                                return (
                                    <div
                                        key={idx}
                                        className="overflow-hidden rounded-xl border border-gray-100 bg-[#FAF8FF] transition-all"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleFAQ(idx)}
                                            className="flex w-full items-center justify-between p-5 text-left font-semibold text-base transition-colors hover:bg-gray-100/50"
                                            style={{ color: TEXT }}
                                        >
                                            <span>{faq.question}</span>
                                            {isOpen ? (
                                                <FiChevronUp className="h-5 w-5 text-primary shrink-0" />
                                            ) : (
                                                <FiChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                                            )}
                                        </button>
                                        <div
                                            className={`transition-all duration-300 ease-in-out ${
                                                isOpen ? 'max-h-[500px] border-t border-gray-100 p-5' : 'max-h-0'
                                            } overflow-hidden`}
                                        >
                                            <p className="text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
                                                {faq.answer}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-on-surface-variant/80">
                            Không tìm thấy câu hỏi nào phù hợp với yêu cầu của bạn.
                        </div>
                    )}
                </div>
            </section>

            {/* Contact Details & Inquiry Form Section */}
            <section id="contact" className="mx-auto max-w-[1280px] px-6 py-16 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight" style={{ color: TEXT }}>
                        Liên hệ trực tiếp với chúng tôi
                    </h2>
                    <p className="mt-2 text-sm max-w-lg mx-auto" style={{ color: TEXT_BODY }}>
                        Bạn có yêu cầu khác hay cần phản hồi trực tiếp? Hãy điền vào biểu mẫu hoặc liên hệ qua kênh hỗ trợ của chúng tôi tại HCMUTE.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                    {/* Left Column: Campus Contact Info */}
                    <div className="space-y-6 lg:col-span-5">
                        <div className="rounded-2xl border border-white/40 bg-white/70 p-6 shadow-sm backdrop-blur-md">
                            <h3 className="text-lg font-bold mb-4" style={{ color: TEXT }}>Thông tin văn phòng</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-start gap-3">
                                    <FiMapPin className="mt-1 h-5 w-5 text-primary shrink-0" />
                                    <div>
                                        <p className="font-bold">Địa chỉ</p>
                                        <p style={{ color: TEXT_BODY }}>
                                            Khu dịch vụ sinh viên, ĐH Sư phạm Kỹ thuật TP.HCM
                                            <br />
                                            Số 1 Võ Văn Ngân, Linh Chiểu, Thủ Đức, TP.HCM
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <FiMail className="mt-1 h-5 w-5 text-primary shrink-0" />
                                    <div>
                                        <p className="font-bold">Email</p>
                                        <p style={{ color: TEXT_BODY }}>support@uteshop.edu.vn</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <FiPhone className="mt-1 h-5 w-5 text-primary shrink-0" />
                                    <div>
                                        <p className="font-bold">Hotline / Zalo</p>
                                        <p style={{ color: TEXT_BODY }}>
                                            (+84) 28 3722 1223
                                            <br />
                                            090 1234 567
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <FiClock className="mt-1 h-5 w-5 text-primary shrink-0" />
                                    <div>
                                        <p className="font-bold">Thời gian hỗ trợ</p>
                                        <p style={{ color: TEXT_BODY }}>Thứ 2 - Thứ 6: 07:30 - 17:00 | Thứ 7: 08:00 - 11:30</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Google Map */}
                        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm aspect-video bg-white">
                            <iframe
                                title="HCMUTE Campus Map Support"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m12!1m3!1d3918.474978783401!2d106.77024477587847!3d10.850232457805174!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3918.474978783401%3A0x8bb6c5270146059d!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBTxrAgcGjhuqFtIEvhu7kgdGh14bqtdCBUUC4gSOG7kyBDaMOtIE1pbmg!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s"
                                className="h-full w-full border-0"
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </div>

                    {/* Right Column: Inquiry Form */}
                    <div className="lg:col-span-7">
                        <div className="rounded-2xl border border-white bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <FiMessageSquare className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-bold" style={{ color: TEXT }}>Gửi thông điệp đến UTEShop</h3>
                            </div>

                            {formSubmitted && (
                                <div className="mb-4 flex items-start gap-3 rounded-lg bg-green-50 p-4 text-green-800 border border-green-200">
                                    <FiCheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-sm">Gửi liên hệ thành công!</p>
                                        <p className="text-xs mt-1 text-green-700">
                                            Cảm ơn bạn đã gửi ý kiến phản hồi. Chúng tôi sẽ phản hồi sớm nhất qua email của bạn.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="contact-name" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            Họ và tên <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="contact-name"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Nguyễn Văn A"
                                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="contact-email" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            id="contact-email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="a@student.hcmute.edu.vn"
                                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="contact-mssv" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            MSSV (Không bắt buộc)
                                        </label>
                                        <input
                                            type="text"
                                            id="contact-mssv"
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value)}
                                            placeholder="22110001"
                                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="contact-subject" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            Chủ đề yêu cầu <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="contact-subject"
                                            required
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Lỗi đơn hàng, Đăng ký ký gửi..."
                                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="contact-message" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Nội dung phản hồi <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        id="contact-message"
                                        required
                                        rows={4}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Nhập nội dung phản hồi chi tiết tại đây..."
                                        className="w-full rounded-lg border border-gray-200 bg-white p-4 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30 resize-y"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full font-semibold text-white shadow-md transition-all active:scale-[0.98] hover:opacity-90 md:w-auto md:px-8"
                                    style={{ backgroundColor: PRIMARY }}
                                >
                                    <FiSend className="h-4 w-4" />
                                    Gửi liên hệ
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
