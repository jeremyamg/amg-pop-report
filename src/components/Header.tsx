'use client';
import { useState } from 'react';
import Image from 'next/image';

const BASE = 'https://www.audiomediagrading.com';

export default function Header() {
  const [openSideBar, setOpenSideBar] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);

  return (
    <>
      <div className="w-full px-6 sm:px-12 relative z-10 flex justify-center bg-[#F8F7F3] border-b border-[#E8E7E0]">
        <div className="max-w-[90rem] h-[72px] w-full items-center justify-between flex">

          {/* Left nav */}
          <div className="hidden lg:flex flex-row gap-8 items-center">

            {/* Products dropdown */}
            <div className="relative">
              <button
                className="text-[18px] text-[#100F0F] hover:opacity-70"
                onClick={() => { setProductsOpen(!productsOpen); setResearchOpen(false); }}
                onBlur={() => setTimeout(() => setProductsOpen(false), 150)}
              >
                Products
              </button>
              {productsOpen && (
                <div className="absolute left-0 mt-2 w-40 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <a href={`${BASE}/pages/vinyl`} className="block px-4 py-2 text-[18px] text-[#100F0F] hover:bg-gray-50">Vinyl</a>
                    <a href={`${BASE}/pages/cd`} className="block px-4 py-2 text-[18px] text-[#100F0F] hover:bg-gray-50">CD</a>
                    <a href={`${BASE}/pages/8-track`} className="block px-4 py-2 text-[18px] text-[#100F0F] hover:bg-gray-50">8 Track</a>
                    <a href={`${BASE}/pages/cassette`} className="block px-4 py-2 text-[18px] text-[#100F0F] hover:bg-gray-50">Cassette</a>
                  </div>
                </div>
              )}
            </div>

            <a className="text-[18px] text-[#100F0F] hover:opacity-70" href={`${BASE}/pages/about-us`}>About</a>

            {/* Research dropdown */}
            <div className="relative">
              <button
                className="text-[18px] text-[#100F0F] hover:opacity-70"
                onClick={() => { setResearchOpen(!researchOpen); setProductsOpen(false); }}
                onBlur={() => setTimeout(() => setResearchOpen(false), 150)}
              >
                Research
              </button>
              {researchOpen && (
                <div className="absolute left-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <a href="/" className="block px-4 py-2 text-[18px] text-[#100F0F] hover:bg-gray-50">Pop Report</a>
                    <a href={`${BASE}/pages/hologram-page`} className="block px-4 py-2 text-[18px] text-[#100F0F] hover:bg-gray-50">HoloID Lookup</a>
                  </div>
                </div>
              )}
            </div>

            <a className="text-[18px] text-[#100F0F] hover:opacity-70" href={`${BASE}/collections/shop-amg-merch`}>Merch</a>
          </div>

          {/* Hamburger (mobile) */}
          <button onClick={() => setOpenSideBar(true)} className="block lg:hidden">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="#100F0F" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Logo — centered */}
          <a href={BASE} className="absolute left-1/2 -translate-x-1/2">
            <Image
              src="/logo/amg.svg"
              alt="AMG logo"
              width={120}
              height={36}
              className="!w-[90px] lg:!w-[120px]"
            />
          </a>

          {/* Right nav */}
          <div className="flex flex-row gap-4 items-center">
            <a
              href={`${BASE}/account/login`}
              className="text-[18px] text-[#100F0F] border border-[#100F0F] rounded-full px-4 py-2 hover:opacity-70"
            >
              Log in
            </a>
            <a href={`${BASE}/cart`} className="hover:opacity-70" aria-label="Cart">
              <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.65311 3.46564L21.6154 5.23382C22.1608 5.28751 22.5614 5.7702 22.5136 6.31617L22.1252 10.7562C22.0859 11.2052 21.7511 11.5724 21.3076 11.6529L6.57242 14.3283M0.619141 1.39429L2.68936 1.8245C3.07605 1.90486 3.37921 2.20529 3.46309 2.59123L6.94246 18.6018C7.04237 19.0615 7.4492 19.3894 7.91965 19.3894H22.2674" stroke="currentColor" strokeLinecap="round"/>
                <circle cx="6.77539" cy="22.9411" r="0.939059" fill="currentColor" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="18.1406" cy="22.9411" r="0.939059" fill="currentColor" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {openSideBar && (
        <div className="fixed top-0 left-0 w-full h-screen z-20 flex flex-row">
          <div className="bg-white w-4/6 py-10 h-full flex flex-col items-center justify-between overflow-y-auto">
            <a href={BASE} onClick={() => setOpenSideBar(false)}>
              <Image src="/logo/amg.svg" alt="AMG logo" width={100} height={30} />
            </a>
            <div className="flex flex-col gap-6 mt-8">
              <div className="flex flex-col gap-2">
                <p className="text-[24px] font-bold text-[#100F0F]">Products</p>
                <a className="text-[18px] pl-4 text-[#100F0F]" href={`${BASE}/pages/vinyl`}>Vinyl</a>
                <a className="text-[18px] pl-4 text-[#100F0F]" href={`${BASE}/pages/cd`}>CD</a>
                <a className="text-[18px] pl-4 text-[#100F0F]" href={`${BASE}/pages/8-track`}>8 Track</a>
                <a className="text-[18px] pl-4 text-[#100F0F]" href={`${BASE}/pages/cassette`}>Cassette</a>
              </div>
              <a className="text-[24px] font-bold text-[#100F0F]" href={`${BASE}/pages/about-us`}>About</a>
              <div className="flex flex-col gap-2">
                <p className="text-[24px] font-bold text-[#100F0F]">Research</p>
                <a className="text-[18px] pl-4 text-[#100F0F] underline" href="/">Pop Report</a>
                <a className="text-[18px] pl-4 text-[#100F0F]" href={`${BASE}/pages/hologram-page`}>HoloID Lookup</a>
              </div>
              <a className="text-[24px] font-bold text-[#100F0F]" href={`${BASE}/collections/shop-amg-merch`}>Merch</a>
            </div>
            <p className="text-sm text-black opacity-40 mt-8">© Audio Media Grading 2026</p>
          </div>
          <div onClick={() => setOpenSideBar(false)} className="bg-[rgba(255,255,255,0.7)] w-2/6 h-full relative">
            <button className="absolute top-9 right-5 bg-black rounded-md p-1" onClick={() => setOpenSideBar(false)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
