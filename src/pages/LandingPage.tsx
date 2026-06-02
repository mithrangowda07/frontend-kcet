import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Images
import logo from "../assets/logo.png";
import enter from "../assets/enter.png";
import explore from "../assets/explore.png";
import connect from "../assets/connect.png";
import build from "../assets/build.png";

// Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

// React
import { useEffect } from "react";

const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();

  // autoplay play/pause logic
  useEffect(() => {
    const btn = document.getElementById("swiperPlayPause");
    const swiperInstance = document.querySelector(".mySwiper")?.swiper;
    if (!swiperInstance || !btn) return;

    let isPlaying = true;

    btn.addEventListener("click", () => {
      if (isPlaying) {
        swiperInstance.autoplay.stop();
        btn.innerHTML = `<i class="fi fi-rr-play-circle"></i>`; // ▶ Correct play icon
      } else {
        swiperInstance.autoplay.start();
        btn.innerHTML = `<i class="fi fi-rs-pause-circle"></i>`; // ⏸ Correct pause icon
      }
      isPlaying = !isPlaying;
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div
        className="bg-gradient-to-br from-[#AEE1D9] to-[#7CC6D9]
                      dark:from-[#0F3D3E] dark:to-[#14505B]
                      text-[#003F41] dark:text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center flex flex-col items-center">
            <img
              src={logo}
              alt="KCET EduGuide Logo"
              className="h-20 w-auto object-contain mb-4"
            />

            <h1
              className="text-5xl font-bold mb-6"
              style={{ fontFamily: "Dancing Script, cursive" }}
            >
              KCET EduGuide
            </h1>

            <p className="text-xl mb-8 text-white">
              Your comprehensive guide to finding the perfect college and branch
              based on your KCET rank
            </p>

            {!isAuthenticated && (
              <Link
                to="/register"
                className="backdrop-blur-md bg-white/20 text-white px-8 py-3 rounded-xl 
                           text-lg font-semibold border border-white/30 
                           hover:bg-white/30 transition"
              >
                Get Started
              </Link>
            )}

            {isAuthenticated && (
              <Link
                to={
                  user?.type_of_student === "counselling"
                    ? "/dashboard/counselling"
                    : "/dashboard/studying"
                }
                className="backdrop-blur-md bg-white/20 text-white px-8 py-3 rounded-xl 
                           text-lg font-semibold border border-white/30 
                           hover:bg-white/30 transition"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-800 dark:text-gray-100">
          How It Works
        </h2>

        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          loop={true}
          pagination={{ clickable: true }}
          autoplay={{ delay: 2500 }}
          navigation={{
            nextEl: ".swiper-button-next-custom",
            prevEl: ".swiper-button-prev-custom",
          }}
          className="mySwiper w-full max-w-4xl mx-auto"
        >
          {/* Slide 1 */}
          <SwiperSlide>
            <div
              className="bg-white dark:bg-slate-800 p-10 rounded-xl shadow-lg 
                            border border-slate-300 dark:border-slate-700 text-center"
            >
              <div className="mb-6 flex justify-center">
                <img
                  src={enter}
                  alt="feature icon"
                  className="w-16 h-16 object-contain"
                />
              </div>

              <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-gray-100">
                Enter Your Rank
              </h3>

              <p className="text-slate-600 dark:text-gray-400 text-lg">
                Provide your KCET rank to instantly receive personalized college
                & branch predictions based on verified historical cutoff data.
              </p>

              <ul className="text-slate-600 dark:text-gray-400 mt-4 space-y-2 text-lg w-[90%] mx-auto text-left">
                <li>• Get accurate admission chances</li>
                <li>• Discover branches you are eligible for</li>
                <li>• Compare opportunities based on rank</li>
              </ul>
            </div>
          </SwiperSlide>

          {/* Slide 2 */}
          <SwiperSlide>
            <div
              className="bg-white dark:bg-slate-800 p-10 rounded-xl shadow-lg 
                            border border-slate-300 dark:border-slate-700 text-center"
            >
              <div className="mb-6 flex justify-center">
                <img
                  src={explore}
                  alt="feature icon"
                  className="w-16 h-16 object-contain"
                />
              </div>

              <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-gray-100">
                Explore Your Best Options
              </h3>

              <p className="text-slate-600 dark:text-gray-400 text-lg">
                Analyze recommendations, study cutoff trends, read real student
                reviews, and compare colleges side-by-side to make informed
                decisions.
              </p>

              <ul className="text-slate-600 dark:text-gray-400 mt-4 space-y-2 text-lg w-[90%] mx-auto text-left">
                <li>• Visualize year-wise cutoff trends</li>
                <li>• Read real student experiences</li>
                <li>• Save & compare colleges side-by-side</li>
                <li>• Filter by location, fees, or college code</li>
              </ul>
            </div>
          </SwiperSlide>

          {/* Slide 3 */}
          <SwiperSlide>
            <div
              className="bg-white dark:bg-slate-800 p-10 rounded-xl shadow-lg 
                            border border-slate-300 dark:border-slate-700 text-center"
            >
              <div className="mb-6 flex justify-center">
                <img
                  src={connect}
                  alt="feature icon"
                  className="w-16 h-16 object-contain"
                />
              </div>

              <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-gray-100">
                Connect With Seniors
              </h3>

              <p className="text-slate-600 dark:text-gray-400 text-lg">
                Ask doubts, gather real insights, and schedule meetings with
                seniors for trusted guidance about branches and colleges.
              </p>

              <ul className="text-slate-600 dark:text-gray-400 mt-4 space-y-2 text-lg w-[90%] mx-auto text-left">
                <li>• Ask doubts about branches & colleges</li>
                <li>• Understand placements, faculty & campus life</li>
                <li>• Receive real guidance from real students</li>
              </ul>
            </div>
          </SwiperSlide>

          {/* Slide 4 */}
          <SwiperSlide>
            <div
              className="bg-white dark:bg-slate-800 p-10 rounded-xl shadow-lg
                            border border-slate-300 dark:border-slate-700 text-center"
            >
              <div className="mb-6 flex justify-center">
                <img
                  src={build}
                  alt="feature icon"
                  className="w-16 h-16 object-contain"
                />
              </div>

              <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-gray-100">
                Build Your Profile
              </h3>

              <p className="text-slate-600 dark:text-gray-400 text-lg">
                Save favourites, track your shortlists, and receive personalized
                counselling insights tailored to your preferences.
              </p>

              <ul className="text-slate-600 dark:text-gray-400 mt-4 space-y-2 text-lg w-[90%] mx-auto text-left">
                <li>• Save favourite colleges & branches</li>
                <li>• Track your analysis & choices anytime</li>
                <li>• Receive personalized guidance</li>
              </ul>
            </div>
          </SwiperSlide>
        </Swiper>

        {/* Custom Navigation + Autoplay Controls */}
        <div className="flex items-center justify-center gap-6 mt-6 text-3xl text-black-500">
          {/* Prev */}
          <button className="swiper-button-prev-custom">
            <i className="fi fi-rs-arrow-small-left"></i>
          </button>

          {/* Play/Pause */}
          <button id="swiperPlayPause" className="text-4xl">
            <i className="fi fi-rs-pause-circle"></i>
          </button>

          {/* Next */}
          <button className="swiper-button-next-custom">
            <i className="fi fi-rs-arrow-small-right"></i>
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
            <strong>Disclaimer:</strong> The cutoffs are taken only from the
            official KCET counselling website. For further confirmation, you may
            visit the{" "}
            <a
              href="https://cetonline.karnataka.gov.in/kea/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-yellow-600 dark:text-yellow-400"
            >
            official KCET website.
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
