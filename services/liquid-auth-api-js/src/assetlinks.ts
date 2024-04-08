export interface AssetLink {
  relation: string[];
  target: {
    namespace: string;
    site?: string;
    package_name?: string;
    sha256_cert_fingerprints?: string[];
  };
}

export const assetLinks: AssetLink[] = [
  {
    relation: [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds',
    ],
    target: {
      namespace: 'web',
      site: 'https://nest-authentication-api.onrender.com',
    },
  },
  {
    relation: [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds',
    ],
    target: {
      namespace: 'android_app',
      package_name: 'foundation.algorand.demo',
      sha256_cert_fingerprints: [
        '47:CC:4E:EE:B9:50:59:A5:8B:E0:19:45:CA:0A:6D:59:16:F9:A9:C2:96:75:F8:F3:64:86:92:46:2B:7D:5D:5C',
      ],
    },
  },
] as const;
