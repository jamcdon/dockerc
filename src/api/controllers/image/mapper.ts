import { IImage, ImageOutput, IImageStr } from '../../../db/nosql/models/Image'
import { QueryObject } from '../../../db/nosql/models'

export const toImage = (image: ImageOutput): IImage => {
    return {
        _id: image._id,
        name: image.name,
        hyperlink: image.hyperlink,
        description: image.description,
        scriptsUsing: image.scriptsUsing,
        reports: image.reports,
        authorID: image.authorID,
    }
}

export const toImages = (images: QueryObject): Array<IImageStr> | undefined => {
    let imageArray: Array<IImageStr> = []
    images.forEach(
        (image) => {
            let urlName = image.name.replace(" ", "+").replace("/", "-")
            imageArray.push({
                _id: image._id,
                name: image.name,
                urlName: urlName,
                hyperlink: image.hyperlink,
                description: image.description,
                scriptsUsing: image.scriptsUsing,
                reports: image.reports,
                authorID: image.authorID,
            })
        }
    )
    if (imageArray[0] != undefined){
        return imageArray
    }
    return undefined
}