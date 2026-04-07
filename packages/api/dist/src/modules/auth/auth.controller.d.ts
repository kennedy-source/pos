import { AuthService } from './auth.service';
declare class LoginDto {
    email: string;
    password: string;
}
declare class RefreshDto {
    refreshToken: string;
}
declare class LogoutDto {
    refreshToken: string;
}
declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
declare class PinLoginDto {
    userId: string;
    pin: string;
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(req: any, _dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: User;
    }>;
    pinLogin(req: any, dto: PinLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: User;
    }>;
    refresh(dto: RefreshDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: User;
    }>;
    logout(req: any, dto: LogoutDto): Promise<{
        message: string;
    }>;
    changePassword(req: any, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getMe(req: any): Promise<any>;
}
export {};
