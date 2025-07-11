'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getImagePath } from '@/utils/images';
import { PolicyModal, PolicyContent } from './PolicyModal';
import TermsContent from '../policies/TermsContent';
import PrivacyPolicyContent from '../policies/PrivacyPolicyContent';
import ShippingPolicyContent from '../policies/ShippingPolicyContent';
import ReturnPolicyContent from '../policies/ReturnPolicyContent';

const Footer = () => {
  const [logoPath, setLogoPath] = useState<string>('');

  useEffect(() => {
    const loadLogo = async () => {
      const path = await getImagePath('VNSHLogoFooter.webp');
      setLogoPath(path);
    };

    loadLogo();
  }, []);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  const openModal = (modalName: string) => setActiveModal(modalName);
  const closeModal = () => setActiveModal(null);
  
  return (
    <footer className="bg-[#f7f4f4] w-full px-4 md:px-8 lg:px-[70px] max-w-[1265px] mx-auto py-8">
      {/* Terms & Conditions Modal */}
      <PolicyModal 
        isOpen={activeModal === 'terms'} 
        onClose={closeModal}
        title="Terms & Disclaimer"
      >
        <PolicyContent >
          <TermsContent />
        </PolicyContent>
      </PolicyModal>

      {/* Privacy Policy Modal */}
      <PolicyModal 
        isOpen={activeModal === 'privacy'} 
        onClose={closeModal}
        title="Privacy Policy"
      >
        <PolicyContent>
          <PrivacyPolicyContent />
        </PolicyContent>
      </PolicyModal>

      {/* Shipping Policy Modal */}
      <PolicyModal 
        isOpen={activeModal === 'shipping'} 
        onClose={closeModal}
        title="Shipping Policy"
      >
        <PolicyContent>
          <ShippingPolicyContent />
        </PolicyContent>
      </PolicyModal>

      {/* Return Policy Modal */}
      <PolicyModal 
        isOpen={activeModal === 'returns'} 
        onClose={closeModal}
        title="Return Policy"
      >
        <PolicyContent>
          <ReturnPolicyContent />
        </PolicyContent>
      </PolicyModal>

      <div className="max-w-[1100px] mx-auto px-4">
        <div id="footer-copyright" className="text-center text-gray-800 text-sm mb-4">
          &copy; {currentYear} VNSH.com. All Rights Reserved.
        </div>
        
        <div id="footer-links" className="flex flex-wrap justify-center gap-4 text-base" style={{ width: '100%', fontSize: '18px', paddingBottom: '20px' }}>
          <button 
            onClick={() => setActiveModal('terms')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#212529',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'none',
              fontFamily: 'Arial, sans-serif'
            }}
            aria-label="View Terms & Disclaimer"
          >
            Terms & Disclaimer
          </button>
          <span style={{ color: '#212529' }}>|</span>
          <button 
            onClick={() => setActiveModal('privacy')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#212529',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'none',
              fontFamily: 'Arial, sans-serif'
            }}
            aria-label="View Privacy Policy"
          >
            Privacy Policy
          </button>
          <span style={{ color: '#212529' }}>|</span>
          <button 
            onClick={() => setActiveModal('shipping')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#212529',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'none',
              fontFamily: 'Arial, sans-serif'
            }}
            aria-label="View Shipping Policy"
          >
            Shipping Policy
          </button>
          <span style={{ color: '#212529' }}>|</span>
          <button 
            onClick={() => setActiveModal('returns')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#212529',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'none',
              fontFamily: 'Arial, sans-serif'
            }}
            aria-label="View Return Policy"
          >
            Return Policy
          </button>
        </div>
        
        {logoPath && (
          <div className="footer-logo-container flex justify-center">
            <div className="w-[325px]">
              <Image 
                src={logoPath}
                alt="VNSH Logo" 
                width={325} 
                height={183} 
                className="w-full h-auto"
                loading="lazy"
                decoding="async"
                quality={85}
                sizes="(max-width: 768px) 100vw, 325px"
              />
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;
