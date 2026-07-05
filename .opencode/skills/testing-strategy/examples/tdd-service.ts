import { describe, it, expect, beforeEach } from "vitest";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

interface EmailService {
  sendWelcome(email: string, name: string): Promise<void>;
}

class UserService {
  constructor(
    private repo: UserRepository,
    private emailService: EmailService
  ) {}

  async register(email: string, name: string): Promise<User> {
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      throw new Error("Email already registered");
    }

    const user: User = {
      id: crypto.randomUUID(),
      email,
      name,
      role: "user",
    };

    const saved = await this.repo.save(user);
    await this.emailService.sendWelcome(saved.email, saved.name);
    return saved;
  }
}

describe("UserService.register", () => {
  let service: UserService;
  let repo: UserRepository;
  let emailService: EmailService;
  let savedUsers: User[];

  beforeEach(() => {
    savedUsers = [];
    repo = {
      findByEmail: async (_email: string) => null,
      save: async (user: User) => {
        savedUsers.push(user);
        return user;
      },
    };
    emailService = {
      sendWelcome: async () => {},
    };
    service = new UserService(repo, emailService);
  });

  it("should create a new user with correct fields", async () => {
    const user = await service.register("test@example.com", "Test User");

    expect(user.email).toBe("test@example.com");
    expect(user.name).toBe("Test User");
    expect(user.role).toBe("user");
    expect(user.id).toBeDefined();
  });

  it("should persist the user via repository", async () => {
    await service.register("test@example.com", "Test User");

    expect(savedUsers).toHaveLength(1);
    expect(savedUsers[0].email).toBe("test@example.com");
  });

  it("should throw if email already exists", async () => {
    repo.findByEmail = async () => ({ id: "1", email: "test@example.com", name: "Existing", role: "user" });

    await expect(service.register("test@example.com", "New User")).rejects.toThrow("Email already registered");
  });

  it("should send welcome email after registration", async () => {
    let sentTo = "";
    emailService.sendWelcome = async (email: string) => {
      sentTo = email;
    };

    await service.register("test@example.com", "Test User");

    expect(sentTo).toBe("test@example.com");
  });
});
