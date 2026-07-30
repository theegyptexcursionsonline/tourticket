export {};

const mockFindOne = jest.fn();

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    findOne: mockFindOne,
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('@/lib/firebase/admin', () => ({
  verifyFirebaseToken: jest.fn(),
}));

const firebaseProfile = {
  uid: 'firebase-uid-1',
  email: 'sara@example.com',
  displayName: 'Sara Example',
  photoURL: 'https://images.example.com/sara.jpg',
  emailVerified: true,
  providerData: [{ providerId: 'google.com' }],
};

describe('Firebase sync for a customer promoted into Team Access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves the bound Google customer sign-in after admin promotion', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const user = {
      _id: 'mongo-user-1',
      firebaseUid: firebaseProfile.uid,
      email: firebaseProfile.email,
      firstName: 'Sara',
      lastName: 'Example',
      role: 'operations',
      permissions: ['manageTours'],
      adminPortalScopes: ['main'],
      authProvider: 'google',
      emailVerified: true,
      isGuestProfile: false,
      isActive: true,
      save,
    };
    const select = jest.fn().mockResolvedValue(user);
    mockFindOne.mockReturnValueOnce({ select });

    const { syncFirebaseUserToMongo } = await import('@/lib/firebase/authHelpers');
    const result = await syncFirebaseUserToMongo(firebaseProfile);

    expect(result.success).toBe(true);
    expect(result.user).toEqual(expect.objectContaining({
      email: firebaseProfile.email,
      role: 'operations',
      authProvider: 'google',
    }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(user.role).toBe('operations');
    expect(user.email).toBe(firebaseProfile.email);
  });

  it('does not let Firebase silently rename a promoted admin identity', async () => {
    const user = {
      _id: 'mongo-user-1',
      firebaseUid: firebaseProfile.uid,
      email: 'original-admin@example.com',
      firstName: 'Sara',
      lastName: 'Example',
      role: 'operations',
      permissions: ['manageTours'],
      authProvider: 'google',
      emailVerified: true,
      isGuestProfile: false,
      isActive: true,
      save: jest.fn(),
    };
    mockFindOne.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue(user),
    });

    const { syncFirebaseUserToMongo } = await import('@/lib/firebase/authHelpers');

    await expect(syncFirebaseUserToMongo(firebaseProfile)).rejects.toMatchObject({
      code: 'ACCOUNT_LINK_REQUIRED',
    });
    expect(user.save).not.toHaveBeenCalled();
  });
});
