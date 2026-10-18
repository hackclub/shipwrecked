const dummyRsvp = {
  id: 'sample',
  firstName: 'dummy',
  lastName: 'dummy',
  email: 'dummy@hackclub.com',
  referralType: 'direct',
  referralCode: 'direct',
  createdAt: new Date().toString(),
};

const redis = {
  set: async (...args: any) => {},
  get: async (key: string, ...args: any) => {
    switch (key) {
      case 'rsvp_data': {
        return dummyRsvp;
      }
      case 'rsvp_count': {
        return 0;
      }
      default:
        return {};
    }
  },
  incr: async (...args: any) => 0,
  expire: async (...args: any) => {},
};

export { redis };
