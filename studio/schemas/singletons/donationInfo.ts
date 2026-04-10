import { defineType } from 'sanity';

export const donationInfo = defineType({
  name: 'donationInfo',
  title: 'Donation Info',
  type: 'document',
  fields: [
    { name: 'bankName', title: 'Bank Name', type: 'string' },
    { name: 'iban', title: 'IBAN', type: 'string' },
    { name: 'bic', title: 'BIC', type: 'string' },
    { name: 'accountHolder', title: 'Account Holder', type: 'string' },
    { name: 'qrCodeImage', title: 'SEPA QR Code', type: 'image' },
    { name: 'donationText', title: 'Donation Text', type: 'localePortableText' },
    { name: 'membershipFormEmbed', title: 'Membership Form URL', type: 'url', description: 'Tally form URL' },
  ],
  preview: { prepare: () => ({ title: 'Donation Info' }) },
});
