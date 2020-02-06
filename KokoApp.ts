import {
    IAppAccessors,
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISetting } from '@rocket.chat/apps-engine/definition/settings';
import {
    IUIKitInteractionHandler,
    UIKitBlockInteractionContext,
    UIKitViewSubmitInteractionContext,
} from '@rocket.chat/apps-engine/definition/uikit';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { KokoOneOnOne } from './actions/KokoOneOnOne';
import { KokoPraise } from './actions/KokoPraise';
import { KokoQuestion } from './actions/KokoQuestion';
import { KokoCommand } from './commands/KokoCommand';
import { OneOnOneEndpoint } from './endpoints/OneOnOneEndpoint';
import { PraiseEndpoint } from './endpoints/PraiseEndpoint';
import { QuestionEndpoint } from './endpoints/QuestionEndpoint';
import { MembersCache } from './MembersCache';
import { praiseModal } from './modals/PraiseModal';
import { questionModal } from './modals/QuestionModal';
import { settings } from './settings';

export class KokoApp extends App implements IUIKitInteractionHandler {
    /**
     * The bot username alias
     */
    public kokoName: string = 'Koko';

    /**
     * The bot avatar
     */
    public kokoEmojiAvatar: string = ':gorilla:';

    /**
     * The room name where to get members from
     */
    public kokoMembersRoomName: string;

    /**
     * The actual room object where to get members from
     */
    public kokoMembersRoom: IRoom;

    /**
     * The room name where to post thanks messages to
     */
    public kokoPostPraiseRoomName: string;

    /**
     * The actual room object where to post thanks messages to
     */
    public kokoPostPraiseRoom: IRoom;

    /**
     * The room name where to post answers to
     */
    public kokoPostAnswersRoomName: string;

    /**
     * The actual room object where to post answers to
     */
    public kokoPostAnswersRoom: IRoom;

    /**
     * The bot username who sends the messages
     */
    public botUsername: string;

    /**
     * The bot user sending messages
     */
    public botUser: IUser;

    /**
     * The praise mechanism
     */
    public readonly kokoPraise: KokoPraise;

    /**
     * The question mechanism
     */
    public readonly kokoQuestion: KokoQuestion;

    /**
     * The random one on one mechanism
     */
    public readonly kokoOneOnOne: KokoOneOnOne;

    /**
     * Members cache
     */
    // tslint:disable-next-line:variable-name
    private _membersCache: MembersCache;

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
        this.kokoPraise = new KokoPraise(this);
        this.kokoQuestion = new KokoQuestion(this);
        this.kokoOneOnOne = new KokoOneOnOne(this);
    }

    /**
     * Sends a praise or answers a question
     */
    public async executeViewSubmitHandler(context: UIKitViewSubmitInteractionContext, read: IRead, http: IHttp, persistence: IPersistence, modify: IModify) {
        const data = context.getInteractionData();
        switch (data.view.id) {
            case 'praise':
                return this.kokoPraise.submit({ context, modify, read, persistence });
            case 'question':
                return this.kokoQuestion.submit({ context, modify, read, persistence });
        }
        return {
            success: true,
        };
    }

    /**
     * Implements the click of a button
     */
    public async executeBlockActionHandler(context: UIKitBlockInteractionContext, read: IRead, http: IHttp, persistence: IPersistence, modify: IModify) {
        const data = context.getInteractionData();
        switch (data.actionId) {
            case 'praise': {
                const modal = await praiseModal({ app: this, data, read, modify });
                return context.getInteractionResponder().openModalViewResponse(modal);
            }
            case 'question': {
                const modal = await questionModal({ read, modify, data });
                return context.getInteractionResponder().openModalViewResponse(modal);
            }
        }
        return {
            success: true,
        };
    }

    /**
     * Loads the room where to get members from
     * Loads the room where to post messages to
     * Loads the user who'll be posting messages as the botUser
     *
     * @param environmentRead
     * @param configModify
     */
    public async onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): Promise<boolean> {
        this.kokoMembersRoomName = await environmentRead.getSettings().getValueById('Members_Room_Name');
        if (this.kokoMembersRoomName) {
            this.kokoMembersRoom = await this.getAccessors().reader.getRoomReader().getByName(this.kokoMembersRoomName) as IRoom;
        } else {
            return false;
        }
        this.kokoPostPraiseRoomName = await environmentRead.getSettings().getValueById('Post_Praise_Room_Name');
        if (this.kokoPostPraiseRoomName) {
            this.kokoPostPraiseRoom = await this.getAccessors().reader.getRoomReader().getByName(this.kokoPostPraiseRoomName) as IRoom;
        } else {
            return false;
        }
        this.kokoPostAnswersRoomName = await environmentRead.getSettings().getValueById('Post_Answers_Room_Name');
        if (this.kokoPostAnswersRoomName) {
            this.kokoPostAnswersRoom = await this.getAccessors().reader.getRoomReader().getByName(this.kokoPostAnswersRoomName) as IRoom;
        } else {
            return false;
        }
        this.botUsername = await environmentRead.getSettings().getValueById('Bot_Username');
        if (this.botUsername) {
            this.botUser = await this.getAccessors().reader.getUserReader().getByUsername(this.botUsername) as IUser;
        } else {
            return false;
        }
        return true;
    }

    /**
     * Updates room ids for members and messages when settings are updated
     *
     * @param setting
     * @param configModify
     * @param read
     * @param http
     */
    public async onSettingUpdated(setting: ISetting, configModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        switch (setting.id) {
            case 'Members_Room_Name':
                this.kokoMembersRoomName = setting.value;
                if (this.kokoMembersRoomName) {
                    this.kokoMembersRoom = await this.getAccessors().reader.getRoomReader().getByName(this.kokoMembersRoomName) as IRoom;
                }
                break;
            case 'Post_Praise_Room_Name':
                this.kokoPostPraiseRoomName = setting.value;
                if (this.kokoPostPraiseRoomName) {
                    this.kokoPostPraiseRoom = await this.getAccessors().reader.getRoomReader().getByName(this.kokoPostPraiseRoomName) as IRoom;
                }
                break;
            case 'Post_Answers_Room_Name':
                this.kokoPostAnswersRoomName = setting.value;
                if (this.kokoPostAnswersRoomName) {
                    this.kokoPostAnswersRoom = await this.getAccessors().reader.getRoomReader().getByName(this.kokoPostAnswersRoomName) as IRoom;
                }
                break;
            case 'Bot_User':
                this.botUsername = setting.value;
                if (this.botUsername) {
                    this.botUser = await this.getAccessors().reader.getUserReader().getByUsername(this.botUsername) as IUser;
                }
                break;
        }
    }

    /**
     * Provides a setting for room id where to get members from
     * Provides a setting for room id where to post messages to
     * Provides an API for activating the praise mechanism
     *
     * @param configuration
     */
    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        // Settings
        await Promise.all(settings.map((setting) => configuration.settings.provideSetting(setting)));

        // API endpoints
        await configuration.api.provideApi({
            visibility: ApiVisibility.PRIVATE,
            security: ApiSecurity.UNSECURE,
            endpoints: [
                new PraiseEndpoint(this),
                new QuestionEndpoint(this),
                new OneOnOneEndpoint(this),
            ],
        });

        // Slash Commands
        await configuration.slashCommands.provideSlashCommand(new KokoCommand(this));
    }

    get membersCache(): MembersCache {
        return this._membersCache;
    }

    set membersCache(memberCache: MembersCache) {
        this._membersCache = memberCache;
    }
}
