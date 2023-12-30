import { BcryptAdapter } from '../../config';
import { UserModel } from '../../data/mongodb';
import { AuthDatasource, CustomError, LoginUserDto, RegisterUserDto, UserEntity } from '../../domain';
import { UserMapper } from '../mappers/user.mapper';


type HashFunction = (password: string) => string;
type CompareFunction = (password: string, hashed: string) => boolean;

export class AuthDatasourceImpl implements AuthDatasource {

    constructor(
        private readonly hashPassword: HashFunction = BcryptAdapter.hash,
        private readonly comparePassword: CompareFunction = BcryptAdapter.compare,
    ) {}


    async login(loginUserDto: LoginUserDto): Promise<UserEntity> {
        const { email, password } = loginUserDto;

        try {

            const user = await UserModel.findOne({ email });
            if ( !user ) throw CustomError.badRequest('Oh! Our server is having a bad day. We are on it, though - email !');

            const isMatching = this.comparePassword( password, user.password );
            if ( !isMatching ) throw CustomError.badRequest('Oh! Our server is having a bad day. We are on it, though - password !');
            return UserMapper.userEntityFromObject(user);

        } catch (error) {
            console.log(error);
            throw CustomError.internalServerError();
        }
    }
    
    async register(registerUserDto: RegisterUserDto): Promise<UserEntity> {

        const { name, email, password } = registerUserDto;

        try {

            // 1. Verificar si el correo existe
            const exists = await UserModel.findOne({ email: email});
            if ( exists ) throw CustomError.badRequest('Oh! Our server is having a bad day. We are on it, though!');

            const user = await UserModel.create({
                name: name,
                email: email,
                password: this.hashPassword(password),
            })

            // 2. Hash de contrasenha

            await user.save()

            // 3. Mapear la respuesta a nuestra entidad

            return UserMapper.userEntityFromObject(user);
            
        } catch (error) {
            
            if( error instanceof CustomError ) {
                throw error;
            }
            throw CustomError.internalServerError();
        }
    }

}