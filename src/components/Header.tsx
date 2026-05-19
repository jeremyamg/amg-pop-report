'use client';
import { useState } from 'react';
import Image from 'next/image';

const BASE = 'https://www.audiomediagrading.com';

export default function Header() {
  const [openSideBar, setOpenSideBar] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);

  return (
    <>
      <div className="w-full px-6 sm:px-12 relative z-10 flex justify-center bg-[#F8F7F3] border-b border-[#E8E7E0]">
        <div className="max-w-[90rem] h-[72px] w-full items-center justify-between flex">

          {/* Left nav */}
          <div className="hidden lg:flex flex-row gap-8 items-center">
            <a className="text-sm font-theme-font-roman text-[#100F0F] hover:opacity-70" href={`${BASE}/products`}>Products</a>
            <a className="text-sm font-theme-font-roman text-[#100F0F] hover:opacity-70" href={`${BASE}/about`}>About</a>

            <div className="relative">
              <button
                className="text-sm font-theme-font-roman text-[#100F0F] hover:opacity-70"
                onClick={() => setResearchOpen(!researchOpen)}
                onBlur={() => setTimeout(() => setResearchOpen(false), 150)}
              >
                Research
              </button>
              {researchOpen && (
                <div className="absolute left-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <a href="/" className="block px-4 py-2 text-sm text-[#100F0F] font-theme-font-roman hover:bg-gray-50">
                      Pop Report
                    </a>
                    <a href={`${BASE}/archiving`} className="block px-4 py-2 text-sm text-[#100F0F] font-theme-font-roman hover:bg-gray-50">
                      HoloID Lookup
                    </a>
                  </div>
                </div>
              )}
            </div>

            <a className="text-sm font-theme-font-roman text-[#100F0F] hover:opacity-70" href={`${BASE}/merch`}>Merch</a>
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
              className="text-sm font-theme-font-roman text-[#100F0F] border border-[#100F0F] rounded-full px-4 py-2 hover:opacity-70"
            >
              Log in
            </a>
            {/* Cart icon (decorative — links to main site cart) */}
            <a href={`${BASE}/cart`} className="hover:opacity-70">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#100F0F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="#100F0F" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M16 10a4 4 0 01-8 0" stroke="#100F0F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {openSideBar && (
        <div className="fixed top-0 left-0 w-full h-screen z-20 flex flex-row">
          <div className="bg-white w-4/6 py-10 h-full flex flex-col items-center justify-between">
            <a href={BASE} onClick={() => setOpenSideBar(false)}>
              <Image src="/logo/amg.svg" alt="AMG logo" width={100} height={30} />
            </a>
            <div className="flex flex-col gap-8">
              <a className="text-[28px] font-theme-font-bold text-[#100F0F]" href={`${BASE}/products`}>Products</a>
              <a className="text-[28px] font-theme-font-bold text-[#100F0F]" href={`${BASE}/about`}>About</a>
              <div className="flex flex-col gap-4">
                <p className="text-[28px] font-theme-font-bold text-[#100F0F]">Research</p>
                <a className="text-[22px] font-theme-font-roman pl-4 underline text-[#100F0F]" href="/">Pop Report</a>
                <a className="text-[22px] font-theme-font-roman pl-4 text-[#100F0F]" href={`${BASE}/archiving`}>HoloID Lookup</a>
              </div>
              <a className="text-[28px] font-theme-font-bold text-[#100F0F]" href={`${BASE}/merch`}>Merch</a>
            </div>
            <p className="text-sm text-black opacity-40">© Audio Media Grading 2026</p>
          </div>
          <div onClick={() => setOpenSideBar(false)} className="bg-[rgba(255,255,255,0.7)] w-2/6 h-full relative">
            <button
              className="absolute top-9 right-5 bg-black rounded-md p-1"
              onClick={() => setOpenSideBar(false)}
            >
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
