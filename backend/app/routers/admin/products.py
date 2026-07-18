from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...admin_deps import get_current_admin
from ...database import get_db
from ...models import AdminUser, Product
from ...schemas_admin import AdminProductIn, AdminProductOut

router = APIRouter(prefix="/admin/products", tags=["admin-products"])


@router.get("", response_model=list[AdminProductOut])
def list_products(_: AdminUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id).all()


@router.post("", response_model=AdminProductOut)
def create_product(
    payload: AdminProductIn,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=AdminProductOut)
def update_product(
    product_id: int,
    payload: AdminProductIn,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="产品不存在")
    for field, value in payload.model_dump().items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="产品不存在")
    db.delete(product)
    db.commit()
    return {"message": "已删除"}
