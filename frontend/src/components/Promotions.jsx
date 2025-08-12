import {useState, useEffect, useRef} from "react";
import {FaChevronLeft, FaChevronRight} from "react-icons/fa";

export default function Promotions() {
    const promotions = [
        {
            id: 1,
            image: "https://dp.image-qoo10.jp/dp2016/JP/GMKT.IMG/mall/2025/08/08/fc11d3b2-4312-462f-b330-e42c905da4cb.jpg",
            link: "",
            alt: "Summer Sale"
        },
        {
            id: 2,
            image: "https://m.media-amazon.com/images/G/09/JP_CCM/2025/SL/08_Aug/Fashion_Big_Sale/03_lp/1_header_dt.jpg",
            link: "",
            alt: "Fashion Big Sale"
        },
        {
            id: 3,
            image: "https://m.media-amazon.com/images/I/71ps0geFajL._SX3000_.jpg",
            link: "",
            alt: "Summer Sale"
        },
        {
            id: 4,
            image: "https://dp.image-qoo10.jp/dp2016/JP/GMKT.IMG/mall/2025/07/28/9d43f13b-6efd-43b3-8e4d-b6c187bd9c67.jpg",
            link: "",
            alt: "Summer Sale"
        },
        {
            id: 5,
            image: "https://dp.image-qoo10.jp/dp2016/JP/GMKT.IMG/mall/2025/08/06/a0f04a36-9143-46f1-86ac-b91ae89fb849.jpg",
            link: "",
            alt: "Obon 2025"
        },
        {
            id: 6,
            image: "https://dp.image-qoo10.jp/dp2016/JP/GMKT.IMG/mall/2025/07/24/3928dad9-51e9-42d9-91bd-c3b8f58f361c.jpg",
            link: "",
            alt: "Obon 2025"
        },
        {
            id: 7,
            image: "https://dp.image-qoo10.jp/dp2016/JP/GMKT.IMG/mall/2025/07/24/1e229832-67bb-4be2-9c7a-b2c86805d0c6.jpg",
            link: "",
            alt: "Obon 2025"
        },
        {
            id: 8,
            image: "https://dp.image-qoo10.jp/dp2016/JP/GMKT.IMG/mall/2025/07/23/374f5439-6e1d-4aa5-949f-c8a3b1c1ecda.jpg",
            link: "",
            alt: "Obon 2025"
        },
        {
            id: 9,
            image: "https://dp.image-qoo10.jp/dp2016/JP/GMKT.IMG/mall/2025/08/07/953d5bb3-0fc7-4e0e-8a56-5e81725c7ade.jpg",
            link: "",
            alt: "Obon 2025"
        },
        {
            id: 10,
            image: "https://dp.image-qoo10.jp/dp2016/JP/GMKT.IMG/mall/2025/08/12/a57c9547-9c3d-4a1c-bfd1-8e0187afe322.jpg",
            link: "",
            alt: "Obon 2025"
        },
        {
            id: 11,
            image: "https://dp.image-qoo10.jp/dp2016/JP/GMKT.IMG/mall/2025/08/06/9c7f9ea7-d5cc-4c19-b144-31fbff31ecc0.jpg",
            link: "",
            alt: "Obon 2025"
        },
    ]

    const [currentSlide, setCurrentSlide] = useState(0);
    const slideInterval = useRef();

    // Auto Slide Functionality
    const startSlideTimer = () => {
        stopSlideTimer()
        slideInterval.current = setInterval(() => {
            setCurrentSlide(prev => (prev === promotions.length - 1 ? 0 : prev + 1));
        }, 2500)
    }

    const stopSlideTimer = () => {
        if (slideInterval.current) {
            clearInterval(slideInterval.current);
        }
    }

    // Navigation Functions
    const goToNext = () => {
        setCurrentSlide(prev => (prev === promotions.length - 1 ? 0 : prev + 1));
        startSlideTimer()
    }

    const goToPrev = () => {
        setCurrentSlide(prev => (prev === 0 ? promotions.length - 1 : prev - 1 ));
        startSlideTimer()
    }

    const goToSlide = (index) => {
        setCurrentSlide(index)
        startSlideTimer()
    }

    // Initialize auto slide on component mount
    useEffect(() => {
        startSlideTimer()
        return () => stopSlideTimer()
    }, [])

    return(
        <div className="container mx-auto p-4">
            <div
                className="relative w-full mx-auto overflow-hidden rounded-lg shadow-md"
                onMouseEnter={stopSlideTimer}
                onMouseLeave={startSlideTimer}
            >
                {/*Main Slide*/}
                <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)`}}
                >
                    {promotions.map((promo) => (
                        <div key={promo.id} className="w-full flex-shrink-0 relative">
                            <a href={promo.link} className="block">
                                <img
                                    src={promo.image}
                                    alt={promo.alt}
                                    className="w-full h-auto lg:h-[500px] object-cover aspect-[2/1] cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
                                />
                            </a>
                        </div>
                    ))}
                </div>

                {/*Navigation Arrows*/}
                <button
                    className="absolute top-1/2 left-5 -translate-y-1/2 bg-white/70 rounded-full w-10 h-10 flex items-center justify-center cursor-pointer z-10 transition-all duration-300 hover:bg-white/90"
                    onClick={goToPrev}
                >
                    <FaChevronLeft />
                </button>
                <button
                    className="absolute top-1/2 right-5 -translate-y-1/2 bg-white/70 rounded-full w-10 h-10 flex items-center justify-center cursor-pointer z-10 transition-all duration-300 hover:bg-white/90"
                    onClick={goToNext}
                >
                    <FaChevronRight />
                </button>

                {/*Slide Indicators*/}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {promotions.map((_, index) => (
                        <button
                            key={index}
                            className={`w-3 h-3 rounded-full border-none cursor-pointer transition-all duration-300 ${
                                index === currentSlide ? "bg-white/90 scale-125" : "bg-white/50"
                            }`}
                            onClick={() => goToSlide(index)}
                        />
                    ))}
                </div>
            </div>
        </div>

    )
}